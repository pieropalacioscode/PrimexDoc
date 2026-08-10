package handler

import (
	"encoding/json"
	"net/http"
	"os"      // NUEVO: Para leer variables de entorno
	"strings" // NUEVO: Para manipular strings

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
)

// NUEVO: Función auxiliar interna para formatear URLs de imágenes
func formatearURLImagen(rutaRelativa string) string {
	if rutaRelativa == "" {
		return ""
	}
	if strings.HasPrefix(rutaRelativa, "http://") || strings.HasPrefix(rutaRelativa, "https://") {
		return rutaRelativa
	}
	baseURL := os.Getenv("MEDIA_BASE_URL")
	// Limpiar / sobrantes para evitar // en la URL
	rutaRelativa = strings.TrimPrefix(rutaRelativa, "/")
	return baseURL + "/" + rutaRelativa
}

type ExamenHandler struct {
	queries *db.Queries
}

func NewExamenHandler(queries *db.Queries) *ExamenHandler {
	return &ExamenHandler{queries: queries}
}

// GET /api/v1/examenes
func (h *ExamenHandler) ListarExamenes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	examenesDB, err := h.queries.ListExamenesActivos(ctx)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al obtener la lista de exámenes"})
		return
	}

	nivelFiltro := r.URL.Query().Get("nivel")
	tipoFiltro := r.URL.Query().Get("tipo")

	response := make([]ExamenResumenDTO, 0, len(examenesDB))
	for _, e := range examenesDB {
		if nivelFiltro != "" && e.Nivel != nivelFiltro {
			continue
		}
		if tipoFiltro != "" && e.Tipo != tipoFiltro {
			continue
		}

		eID, _ := uuid.FromBytes(e.ID.Bytes[:])

		response = append(response, ExamenResumenDTO{
			ID:                eID,
			Titulo:            e.Titulo,
			CodigoCuadernillo: e.CodigoCuadernillo,
			Descripcion:       e.Descripcion.String,
			Nivel:             e.Nivel,
			Tipo:              e.Tipo,
			Anio:              e.Anio,
			TotalPreguntas:    e.TotalPreguntas,
			DuracionMinutos:   e.DuracionMinutos,
			// Si tu ExamenResumenDTO tuviera imagen, se aplicaría aquí:
			// ImagenPortada: formatearURLImagen(e.ImagenPortada.String),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

// GET /api/v1/examenes/{id}
func (h *ExamenHandler) ObtenerExamenPorID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")

	parsedUUID, err := uuid.Parse(idStr)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "ID de examen inválido"})
		return
	}

	pgUUID := pgtype.UUID{Bytes: parsedUUID, Valid: true}

	examenDB, err := h.queries.GetExamenByID(ctx, pgUUID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Examen no encontrado"})
		return
	}

	textosDB, err := h.queries.GetTextosBaseByExamenID(ctx, pgUUID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al cargar los textos base"})
		return
	}

	textosDTO := make([]TextoBaseDTO, 0, len(textosDB))
	for _, t := range textosDB {
		tID, _ := uuid.FromBytes(t.ID.Bytes[:])
		textosDTO = append(textosDTO, TextoBaseDTO{
			ID:              tID,
			CodigoTextoBase: t.CodigoTextoBase,
			Titulo:          t.Titulo.String,
			Contenido:       t.Contenido,
		})
	}

	preguntasDB, err := h.queries.GetPreguntasByExamenID(ctx, pgUUID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al cargar las preguntas"})
		return
	}

	preguntaUUIDs := make([]pgtype.UUID, 0, len(preguntasDB))
	for _, p := range preguntasDB {
		preguntaUUIDs = append(preguntaUUIDs, p.ID)
	}

	opcionesDB, err := h.queries.GetOpcionesByPreguntaIDs(ctx, preguntaUUIDs)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al cargar las opciones de las preguntas"})
		return
	}

	opcionesPorPregunta := make(map[uuid.UUID][]OpcionDTO)
	for _, o := range opcionesDB {
		pID, _ := uuid.FromBytes(o.PreguntaID.Bytes[:])
		oID, _ := uuid.FromBytes(o.ID.Bytes[:])

		opcionesPorPregunta[pID] = append(opcionesPorPregunta[pID], OpcionDTO{
			ID:          oID,
			PreguntaID:  pID,
			Etiqueta:    o.Etiqueta,
			TextoOpcion: o.TextoOpcion,
		})
	}

	preguntasDTO := make([]PreguntaDTO, 0, len(preguntasDB))
	for _, p := range preguntasDB {
		pID, _ := uuid.FromBytes(p.ID.Bytes[:])

		var textoBaseIDPtr *uuid.UUID
		if p.TextoBaseID.Valid {
			tbID, _ := uuid.FromBytes(p.TextoBaseID.Bytes[:])
			textoBaseIDPtr = &tbID
		}

		opciones := opcionesPorPregunta[pID]
		if opciones == nil {
			opciones = []OpcionDTO{}
		}

		preguntasDTO = append(preguntasDTO, PreguntaDTO{
			ID:             pID,
			NumeroPregunta: p.NumeroPregunta,
			TextoPregunta:  p.TextoPregunta,
			TextoBaseID:    textoBaseIDPtr,
			// NUEVO: Aquí aplicamos el formateo a la imagen de la pregunta
			UrlImagen: formatearURLImagen(p.UrlImagen.String),
			Opciones:  opciones,
		})
	}

	exID, _ := uuid.FromBytes(examenDB.ID.Bytes[:])
	detalle := ExamenDetalleDTO{
		ID:                exID,
		Titulo:            examenDB.Titulo,
		CodigoCuadernillo: examenDB.CodigoCuadernillo,
		Descripcion:       examenDB.Descripcion.String,
		Nivel:             examenDB.Nivel,
		Tipo:              examenDB.Tipo,
		Anio:              examenDB.Anio,
		TotalPreguntas:    examenDB.TotalPreguntas,
		DuracionMinutos:   examenDB.DuracionMinutos,
		TextosBase:        textosDTO,
		Preguntas:         preguntasDTO,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(detalle)
}

func (h *ExamenHandler) ListarFavoritos(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := auth.GetUserID(r.Context())
	if !ok {
		http.Error(w, "No autorizado", http.StatusUnauthorized)
		return
	}

	userID, _ := uuid.Parse(userIDStr)
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	favs, err := h.queries.ListarExamenesGuardados(r.Context(), pgUserID)
	if err != nil {
		http.Error(w, "Error al obtener favoritos", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(favs)
}

func (h *ExamenHandler) ToggleFavorito(w http.ResponseWriter, r *http.Request) {
	// USAR EL HELPER DEL MIDDLEWARE
	userIDStr, ok := auth.GetUserID(r.Context())
	if !ok {
		// Esto imprimirá en tu consola de Go si vuelve a fallar
		println("DEBUG: No se pudo extraer UserID del contexto con la llave correcta")
		http.Error(w, `{"error":"No autorizado"}`, http.StatusUnauthorized)
		return
	}

	// Convertir el string del contexto a UUID para la base de datos
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		http.Error(w, "ID de usuario inválido", http.StatusUnauthorized)
		return
	}

	examenIDStr := chi.URLParam(r, "id")
	examenID, _ := uuid.Parse(examenIDStr)

	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}
	pgExamenID := pgtype.UUID{Bytes: examenID, Valid: true}

	// Lógica de Toggle
	existe, _ := h.queries.EsExamenGuardado(r.Context(), db.EsExamenGuardadoParams{
		UsuarioID: pgUserID,
		ExamenID:  pgExamenID,
	})

	if existe {
		h.queries.EliminarExamenGuardado(r.Context(), db.EliminarExamenGuardadoParams{
			UsuarioID: pgUserID,
			ExamenID:  pgExamenID,
		})
		w.WriteHeader(http.StatusNoContent)
	} else {
		h.queries.GuardarExamen(r.Context(), db.GuardarExamenParams{
			UsuarioID: pgUserID,
			ExamenID:  pgExamenID,
		})
		w.WriteHeader(http.StatusCreated)
	}
}

func (h *ExamenHandler) EliminarFavorito(w http.ResponseWriter, r *http.Request) {
	// 1. Extraer el usuario_id del contexto (inyectado por el middleware de autenticación)
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "Usuario no autenticado", http.StatusUnauthorized)
		return
	}

	// 2. Extraer el ID del examen desde la URL (usando chi router)
	examenIDStr := chi.URLParam(r, "id")
	examenID, err := uuid.Parse(examenIDStr)
	if err != nil {
		http.Error(w, "ID de examen inválido", http.StatusBadRequest)
		return
	}

	// 3. Convertir los UUIDs a pgtype.UUID (formato que utiliza sqlc con pgx/v5)
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}
	pgExamenID := pgtype.UUID{Bytes: examenID, Valid: true}

	// 4. Ejecutar la consulta generada por sqlc
	err = h.queries.EliminarExamenGuardado(r.Context(), db.EliminarExamenGuardadoParams{
		UsuarioID: pgUserID,
		ExamenID:  pgExamenID,
	})
	if err != nil {
		http.Error(w, "Error al eliminar el examen de favoritos", http.StatusInternalServerError)
		return
	}

	// 5. Responder con confirmación de éxito
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "Examen eliminado de favoritos correctamente",
	})
}
