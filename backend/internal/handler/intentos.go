package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type IntentoHandler struct {
	queries *db.Queries
}

func NewIntentoHandler(queries *db.Queries) *IntentoHandler {
	return &IntentoHandler{queries: queries}
}

// ==========================================
// 💡 HELPERS AUXILIARES DE RESPUESTA JSON
// ==========================================

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

// ==========================================
// 🎯 HANDLERS DE INTENTOS
// ==========================================

// POST /api/v1/intentos
func (h *IntentoHandler) IniciarIntento(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}

	usuarioUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	var req IniciarIntentoRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Cuerpo de petición inválido")
		return
	}

	pgExamenID := pgtype.UUID{Bytes: req.ExamenID, Valid: true}

	examen, err := h.queries.GetExamenByID(ctx, pgExamenID)
	if err != nil {
		respondError(w, http.StatusNotFound, "Examen no encontrado")
		return
	}

	intentoDB, err := h.queries.IniciarIntento(ctx, db.IniciarIntentoParams{
		UsuarioID:      pgtype.UUID{Bytes: usuarioUUID, Valid: true},
		ExamenID:       pgExamenID,
		Modo:           req.Modo,
		TotalPreguntas: examen.TotalPreguntas,
	})
	if err != nil {
		log.Printf("❌ ERROR REAL AL INICIAR INTENTO EN BD: %v", err)
		respondError(w, http.StatusInternalServerError, "Error al iniciar el intento")
		return
	}

	iID, _ := uuid.FromBytes(intentoDB.ID.Bytes[:])
	eID, _ := uuid.FromBytes(intentoDB.ExamenID.Bytes[:])

	resumen := IntentoResumenDTO{
		ID:             iID,
		ExamenID:       eID,
		Modo:           intentoDB.Modo,
		TotalPreguntas: examen.TotalPreguntas,
		Estado:         intentoDB.Estado,
		IniciadoEn:     intentoDB.IniciadoEn.Time,
	}

	respondJSON(w, http.StatusCreated, resumen)
}

// POST /api/v1/intentos/{id}/finalizar
func (h *IntentoHandler) FinalizarIntento(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Extraer ID de usuario del contexto autenticado
	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}
	usuarioID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}
	pgUsuarioID := pgtype.UUID{Bytes: usuarioID, Valid: true}

	// 2. Extraer ID del intento desde los parámetros de la URL (chi)
	intentoIDStr := chi.URLParam(r, "id")
	intentoID, err := uuid.Parse(intentoIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID de intento inválido")
		return
	}
	pgIntentoID := pgtype.UUID{Bytes: intentoID, Valid: true}

	var req FinalizarIntentoRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Petición inválida")
		return
	}

	intentoDB, err := h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
		ID:        pgIntentoID,
		UsuarioID: pgUsuarioID,
	})
	if err != nil {
		respondError(w, http.StatusNotFound, "Intento no encontrado o no pertenece al usuario")
		return
	}

	clavesDB, err := h.queries.GetClavesYExplicacionesByExamenID(ctx, intentoDB.ExamenID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error al consultar la clave de respuestas")
		return
	}

	claveMap := make(map[uuid.UUID]uuid.UUID)
	for _, c := range clavesDB {
		pID, _ := uuid.FromBytes(c.PreguntaID.Bytes[:])
		cID, _ := uuid.FromBytes(c.OpcionCorrectaID.Bytes[:])
		claveMap[pID] = cID
	}

	mapaRespuestasEnviadas := make(map[uuid.UUID]*uuid.UUID)
	for _, resp := range req.Respuestas {
		mapaRespuestasEnviadas[resp.PreguntaID] = resp.OpcionSeleccionadaID
	}

	var correctas, incorrectas int32

	for preguntaID, opcionCorrectaID := range claveMap {
		opcionSeleccionadaPtr, respondida := mapaRespuestasEnviadas[preguntaID]

		var pgOpcionSel pgtype.UUID
		esCorrecta := false

		if respondida && opcionSeleccionadaPtr != nil {
			pgOpcionSel = pgtype.UUID{Bytes: *opcionSeleccionadaPtr, Valid: true}
			if *opcionSeleccionadaPtr == opcionCorrectaID {
				esCorrecta = true
				correctas++
			} else {
				incorrectas++
			}
		}

		_ = h.queries.RegistrarRespuestaIntento(ctx, db.RegistrarRespuestaIntentoParams{
			IntentoID:            pgIntentoID,
			PreguntaID:           pgtype.UUID{Bytes: preguntaID, Valid: true},
			OpcionSeleccionadaID: pgOpcionSel,
			EsCorrecta:           esCorrecta,
		})
	}

	puntaje := float64(correctas) * 2.0

	var puntajeNumeric pgtype.Numeric
	_ = puntajeNumeric.Scan(fmt.Sprintf("%.2f", puntaje))

	err = h.queries.FinalizarIntento(ctx, db.FinalizarIntentoParams{
		ID:                     pgIntentoID,
		Puntaje:                puntajeNumeric,
		PreguntasCorrectas:     correctas,
		PreguntasIncorrectas:   incorrectas,
		TiempoEmpleadoSegundos: int32(req.TiempoEmpleadoSegundos), // 👈 PASANDO EL TIEMPO EMPLEADO
		UsuarioID:              pgUsuarioID,
	})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error al finalizar el intento")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"mensaje":               "Simulacro finalizado con éxito",
		"puntaje":               puntaje,
		"preguntas_correctas":   correctas,
		"preguntas_incorrectas": incorrectas,
	})
}

// GET /api/v1/intentos
func (h *IntentoHandler) ListarIntentos(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := auth.GetUserID(r.Context())
	if !ok || userIDStr == "" {
		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}

	usuarioID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}
	pgUsuarioID := pgtype.UUID{Bytes: usuarioID, Valid: true}

	intentos, err := h.queries.ListarIntentosPorUsuario(r.Context(), pgUsuarioID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error al obtener historial de intentos")
		return
	}

	if intentos == nil {
		respondJSON(w, http.StatusOK, []interface{}{})
		return
	}

	respondJSON(w, http.StatusOK, intentos)
}

// GET /api/v1/intentos/{id}
func (h *IntentoHandler) ObtenerIntentoPorID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}
	usuarioUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}
	pgUsuarioID := pgtype.UUID{Bytes: usuarioUUID, Valid: true}

	intentoIDStr := chi.URLParam(r, "id")
	intentoUUID, err := uuid.Parse(intentoIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID de intento inválido")
		return
	}
	pgIntentoID := pgtype.UUID{Bytes: intentoUUID, Valid: true}

	intentoDB, err := h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
		ID:        pgIntentoID,
		UsuarioID: pgUsuarioID,
	})
	if err != nil {
		respondError(w, http.StatusNotFound, "Intento no encontrado")
		return
	}

	respuestasDB, err := h.queries.GetRespuestasPorIntentoID(ctx, pgIntentoID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error al obtener respuestas guardadas")
		return
	}

	respuestasMap := make(map[uuid.UUID]db.GetRespuestasPorIntentoIDRow)
	for _, resp := range respuestasDB {
		pID, _ := uuid.FromBytes(resp.PreguntaID.Bytes[:])
		respuestasMap[pID] = resp
	}

	clavesDB, err := h.queries.GetClavesYExplicacionesByExamenID(ctx, intentoDB.ExamenID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error al consultar claves")
		return
	}

	detalles := make([]DetalleRespuestaRetroalimentacionDTO, 0, len(clavesDB))
	for _, c := range clavesDB {
		pID, _ := uuid.FromBytes(c.PreguntaID.Bytes[:])
		cID, _ := uuid.FromBytes(c.OpcionCorrectaID.Bytes[:])

		var opcionSelPtr *uuid.UUID
		esCorrecta := false

		if resp, existe := respuestasMap[pID]; existe {
			if resp.OpcionSeleccionadaID.Valid {
				oID, _ := uuid.FromBytes(resp.OpcionSeleccionadaID.Bytes[:])
				opcionSelPtr = &oID
			}
			esCorrecta = resp.EsCorrecta
		}

		detalles = append(detalles, DetalleRespuestaRetroalimentacionDTO{
			PreguntaID:           pID,
			NumeroPregunta:       c.NumeroPregunta,
			OpcionSeleccionadaID: opcionSelPtr,
			OpcionCorrectaID:     cID,
			EsCorrecta:           esCorrecta,
			Explicacion:          c.Explicacion.String,
		})
	}

	iID, _ := uuid.FromBytes(intentoDB.ID.Bytes[:])
	eID, _ := uuid.FromBytes(intentoDB.ExamenID.Bytes[:])

	var puntajeFloat float64
	if intentoDB.Puntaje.Valid {
		f, _ := intentoDB.Puntaje.Float64Value()
		puntajeFloat = f.Float64
	}

	resumen := IntentoResumenDTO{
		ID:                     iID,
		ExamenID:               eID,
		ExamenTitulo:           intentoDB.ExamenTitulo,
		Modo:                   intentoDB.Modo,
		Puntaje:                puntajeFloat,
		TotalPreguntas:         intentoDB.TotalPreguntas,
		PreguntasCorrectas:     intentoDB.PreguntasCorrectas,
		PreguntasIncorrectas:   intentoDB.PreguntasIncorrectas,
		TiempoEmpleadoSegundos: intentoDB.TiempoEmpleadoSegundos,
		Estado:                 intentoDB.Estado,
		IniciadoEn:             intentoDB.IniciadoEn.Time,
	}

	if intentoDB.FinalizadoEn.Valid {
		resumen.FinalizadoEn = &intentoDB.FinalizadoEn.Time
	}

	respondJSON(w, http.StatusOK, ReporteIntentoDetalleDTO{
		Intento:  resumen,
		Detalles: detalles,
	})
}

// // GET /api/v1/intentos/{id}/resultados
// func (h *IntentoHandler) ObtenerResultados(w http.ResponseWriter, r *http.Request) {
// 	ctx := r.Context()

// 	userIDStr, ok := auth.GetUserID(ctx)
// 	if !ok || userIDStr == "" {
// 		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
// 		return
// 	}
// 	usuarioID, err := uuid.Parse(userIDStr)
// 	if err != nil {
// 		respondError(w, http.StatusBadRequest, "ID de usuario inválido")
// 		return
// 	}
// 	pgUsuarioID := pgtype.UUID{Bytes: usuarioID, Valid: true}

// 	intentoIDStr := chi.URLParam(r, "id")
// 	intentoUUID, err := uuid.Parse(intentoIDStr)
// 	if err != nil {
// 		respondError(w, http.StatusBadRequest, "ID de intento inválido")
// 		return
// 	}
// 	pgIntentoID := pgtype.UUID{Bytes: intentoUUID, Valid: true}

// 	_, err = h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
// 		ID:        pgIntentoID,
// 		UsuarioID: pgUsuarioID,
// 	})
// 	if err != nil {
// 		respondError(w, http.StatusNotFound, "Intento no encontrado o acceso denegado")
// 		return
// 	}

// 	resultados, err := h.queries.ObtenerDetalleResultado(ctx, pgIntentoID)
// 	if err != nil {
// 		respondError(w, http.StatusInternalServerError, "Error al obtener resultados detallados")
// 		return
// 	}

// 	if resultados == nil {
// 		respondJSON(w, http.StatusOK, []interface{}{})
// 		return
// 	}

// 	respondJSON(w, http.StatusOK, resultados)
// }

// ListarHistorial devuelve todos los simulacros realizados por el usuario autenticado
func (h *IntentoHandler) ListarHistorial(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := auth.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}

	var userUUID pgtype.UUID
	if err := userUUID.Scan(userIDStr); err != nil {
		respondError(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	intentos, err := h.queries.ListarIntentosPorUsuario(r.Context(), userUUID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error al consultar historial de intentos")
		return
	}

	if intentos == nil {
		intentos = []db.ListarIntentosPorUsuarioRow{}
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"total":    len(intentos),
		"intentos": intentos,
	})
}

// ObtenerResultadoDetalle devuelve el header del intento y el desglose de preguntas con explicaciones y lecturas
func (h *IntentoHandler) ObtenerResultadoDetalle(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := auth.GetUserID(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}

	intentoIDStr := chi.URLParam(r, "id")
	var intentoUUID, userUUID pgtype.UUID

	if err := intentoUUID.Scan(intentoIDStr); err != nil || userUUID.Scan(userIDStr) != nil {
		respondError(w, http.StatusBadRequest, "IDs con formato inválido")
		return
	}

	intentoHeader, err := h.queries.ObtenerIntentoPorID(r.Context(), db.ObtenerIntentoPorIDParams{
		ID:        intentoUUID,
		UsuarioID: userUUID,
	})
	if err != nil {
		respondError(w, http.StatusNotFound, "Intento no encontrado o no tienes permiso para verlo")
		return
	}

	detalleDB, err := h.queries.ObtenerDetalleResultado(r.Context(), intentoUUID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error al consultar la retroalimentación del intento")
		return
	}

	// Mapeamos para el Frontend
	type OpcionDTO struct {
		ID          uuid.UUID `json:"id"`
		Etiqueta    string    `json:"etiqueta"`
		TextoOpcion string    `json:"texto_opcion"`
	}

	type PreguntaResultadoDTO struct {
		PreguntaID           uuid.UUID   `json:"pregunta_id"`
		NumeroPregunta       int32       `json:"numero_pregunta"`
		Enunciado            string      `json:"enunciado"`
		TextoBaseID          *uuid.UUID  `json:"texto_base_id,omitempty"`
		TextoBaseTitulo      string      `json:"texto_base_titulo,omitempty"`
		TextoBaseContenido   string      `json:"texto_base_contenido,omitempty"`
		Explicacion          string      `json:"explicacion"`
		OpcionSeleccionadaID *uuid.UUID  `json:"opcion_seleccionada_id"`
		OpcionCorrectaID     *uuid.UUID  `json:"opcion_correcta_id"`
		EsCorrecta           bool        `json:"es_correcta"`
		Opciones             []OpcionDTO `json:"opciones"`
	}

	preguntasFormateadas := make([]PreguntaResultadoDTO, 0, len(detalleDB))
	for _, d := range detalleDB {
		pID, _ := uuid.FromBytes(d.PreguntaID.Bytes[:])

		var textoBaseIDPtr *uuid.UUID
		var tbTitulo, tbContenido string
		if d.TextoBaseID.Valid {
			tbID, _ := uuid.FromBytes(d.TextoBaseID.Bytes[:])
			textoBaseIDPtr = &tbID
			tbTitulo = d.TextoBaseTitulo.String
			tbContenido = d.TextoBaseContenido.String
		}

		var opSelPtr *uuid.UUID
		if d.OpcionSeleccionadaID.Valid {
			osID, _ := uuid.FromBytes(d.OpcionSeleccionadaID.Bytes[:])
			opSelPtr = &osID
		}

		var opCorrPtr *uuid.UUID
		if d.OpcionCorrectaID.Valid {
			ocID, _ := uuid.FromBytes(d.OpcionCorrectaID.Bytes[:])
			opCorrPtr = &ocID
		}

		// Deserializar las opciones JSONB que vienen de la BD
		var opciones []OpcionDTO
		if len(d.OpcionesJson) > 0 {
			_ = json.Unmarshal(d.OpcionesJson, &opciones)
		}

		preguntasFormateadas = append(preguntasFormateadas, PreguntaResultadoDTO{
			PreguntaID:           pID,
			NumeroPregunta:       d.NumeroPregunta,
			Enunciado:            d.Enunciado,
			TextoBaseID:          textoBaseIDPtr,
			TextoBaseTitulo:      tbTitulo,
			TextoBaseContenido:   tbContenido,
			Explicacion:          d.Explicacion.String,
			OpcionSeleccionadaID: opSelPtr,
			OpcionCorrectaID:     opCorrPtr,
			EsCorrecta:           d.EsCorrecta,
			Opciones:             opciones,
		})
	}

	// (El resto de la función hacia abajo queda igual, donde armas resumenDTO)

	// Formatear el resumen incluyendo el tiempo empleado
	var puntajeFloat float64
	if intentoHeader.Puntaje.Valid {
		f, _ := intentoHeader.Puntaje.Float64Value()
		puntajeFloat = f.Float64
	}

	resumenDTO := map[string]interface{}{
		"id":                       uuid.Must(uuid.FromBytes(intentoHeader.ID.Bytes[:])),
		"examen_id":                uuid.Must(uuid.FromBytes(intentoHeader.ExamenID.Bytes[:])),
		"examen_titulo":            intentoHeader.ExamenTitulo,
		"modo":                     intentoHeader.Modo,
		"puntaje":                  puntajeFloat,
		"total_preguntas":          intentoHeader.TotalPreguntas,
		"preguntas_correctas":      intentoHeader.PreguntasCorrectas,
		"preguntas_incorrectas":    intentoHeader.PreguntasIncorrectas,
		"tiempo_empleado_segundos": intentoHeader.TiempoEmpleadoSegundos, // 👈 TIEMPO USADO DISPONIBLE PARA EL FRONT
		"estado":                   intentoHeader.Estado,
		"iniciado_en":              intentoHeader.IniciadoEn.Time,
	}

	if intentoHeader.FinalizadoEn.Valid {
		resumenDTO["finalizado_en"] = intentoHeader.FinalizadoEn.Time
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"resumen":   resumenDTO,
		"preguntas": preguntasFormateadas,
	})
}
