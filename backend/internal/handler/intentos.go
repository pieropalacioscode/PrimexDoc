package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"log"
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

// POST /api/v1/intentos
func (h *IntentoHandler) IniciarIntento(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		http.Error(w, `{"error":"Usuario no autenticado"}`, http.StatusUnauthorized)
		return
	}

	usuarioUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"ID de usuario inválido"}`, http.StatusBadRequest)
		return
	}

	var req IniciarIntentoRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Cuerpo de petición inválido"})
		return
	}

	pgExamenID := pgtype.UUID{Bytes: req.ExamenID, Valid: true}

	examen, err := h.queries.GetExamenByID(ctx, pgExamenID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Examen no encontrado"})
		return
	}

	intentoDB, err := h.queries.IniciarIntento(ctx, db.IniciarIntentoParams{
		UsuarioID:      pgtype.UUID{Bytes: usuarioUUID, Valid: true},
		ExamenID:       pgExamenID,
		Modo:           req.Modo,
		TotalPreguntas: examen.TotalPreguntas,
	})
	if err != nil {
		// 🔴 AQUÍ ES DONDE IMPRIMIMOS EL ERROR REAL
		log.Printf("❌ ERROR REAL AL INICIAR INTENTO EN BD: %v", err)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al iniciar el intento"})
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

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resumen)
}

// POST /api/v1/intentos/{id}/finalizar
func (h *IntentoHandler) FinalizarIntento(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Extraer ID de usuario del contexto autenticado
	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		http.Error(w, `{"error":"Usuario no autenticado"}`, http.StatusUnauthorized)
		return
	}
	usuarioID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"ID de usuario inválido"}`, http.StatusBadRequest)
		return
	}
	pgUsuarioID := pgtype.UUID{Bytes: usuarioID, Valid: true}

	// 2. Extraer ID del intento desde los parámetros de la URL (chi)
	intentoIDStr := chi.URLParam(r, "id")
	intentoID, err := uuid.Parse(intentoIDStr)
	if err != nil {
		http.Error(w, `{"error":"ID de intento inválido"}`, http.StatusBadRequest)
		return
	}
	pgIntentoID := pgtype.UUID{Bytes: intentoID, Valid: true}

	var req FinalizarIntentoRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Petición inválida"})
		return
	}

	intentoDB, err := h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
		ID:        pgIntentoID,
		UsuarioID: pgUsuarioID,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Intento no encontrado o no pertenece al usuario"})
		return
	}

	clavesDB, err := h.queries.GetClavesYExplicacionesByExamenID(ctx, intentoDB.ExamenID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al consultar la clave de respuestas"})
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
		ID:                   pgIntentoID,
		Puntaje:              puntajeNumeric,
		PreguntasCorrectas:   correctas,
		PreguntasIncorrectas: incorrectas,
		UsuarioID:            pgUsuarioID,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al finalizar el intento"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
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
		http.Error(w, `{"error":"Usuario no autenticado"}`, http.StatusUnauthorized)
		return
	}

	usuarioID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"ID de usuario inválido"}`, http.StatusBadRequest)
		return
	}
	pgUsuarioID := pgtype.UUID{Bytes: usuarioID, Valid: true}

	intentos, err := h.queries.ListarIntentosPorUsuario(r.Context(), pgUsuarioID)
	if err != nil {
		http.Error(w, `{"error":"Error al obtener historial de intentos"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if intentos == nil {
		// Responde [] en lugar de null sin depender del nombre exacto
		// del tipo de fila que genera sqlc.
		_, _ = w.Write([]byte("[]"))
		return
	}
	_ = json.NewEncoder(w).Encode(intentos)
}

// GET /api/v1/intentos/{id}
func (h *IntentoHandler) ObtenerIntentoPorID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		http.Error(w, `{"error":"Usuario no autenticado"}`, http.StatusUnauthorized)
		return
	}
	usuarioUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, `{"error":"ID de usuario inválido"}`, http.StatusBadRequest)
		return
	}
	pgUsuarioID := pgtype.UUID{Bytes: usuarioUUID, Valid: true}

	intentoIDStr := chi.URLParam(r, "id")
	intentoUUID, err := uuid.Parse(intentoIDStr)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "ID de intento inválido"})
		return
	}
	pgIntentoID := pgtype.UUID{Bytes: intentoUUID, Valid: true}

	intentoDB, err := h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
		ID:        pgIntentoID,
		UsuarioID: pgUsuarioID,
	})
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Intento no encontrado"})
		return
	}

	respuestasDB, err := h.queries.GetRespuestasPorIntentoID(ctx, pgIntentoID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al obtener respuestas guardadas"})
		return
	}

	respuestasMap := make(map[uuid.UUID]db.GetRespuestasPorIntentoIDRow)
	for _, resp := range respuestasDB {
		pID, _ := uuid.FromBytes(resp.PreguntaID.Bytes[:])
		respuestasMap[pID] = resp
	}

	clavesDB, err := h.queries.GetClavesYExplicacionesByExamenID(ctx, intentoDB.ExamenID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al consultar claves"})
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
		ID:                   iID,
		ExamenID:             eID,
		ExamenTitulo:         intentoDB.ExamenTitulo,
		Modo:                 intentoDB.Modo,
		Puntaje:              puntajeFloat,
		TotalPreguntas:       intentoDB.TotalPreguntas,
		PreguntasCorrectas:   intentoDB.PreguntasCorrectas,
		PreguntasIncorrectas: intentoDB.PreguntasIncorrectas,
		Estado:               intentoDB.Estado,
		IniciadoEn:           intentoDB.IniciadoEn.Time,
	}

	if intentoDB.FinalizadoEn.Valid {
		resumen.FinalizadoEn = &intentoDB.FinalizadoEn.Time
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(ReporteIntentoDetalleDTO{
		Intento:  resumen,
		Detalles: detalles,
	})
}
