package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/alienwarecode/docent-primex-api/internal/db"
)

type ExamenHandler struct {
	queries *db.Queries
}

func NewExamenHandler(queries *db.Queries) *ExamenHandler {
	return &ExamenHandler{queries: queries}
}

// GET /api/v1/examenes
// Soporta query parameters opcionales: ?nivel=primaria&tipo=nombramiento
func (h *ExamenHandler) ListarExamenes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	examenesDB, err := h.queries.ListExamenesActivos(ctx)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al obtener la lista de exámenes"})
		return
	}

	// Obtener filtros de la URL
	nivelFiltro := r.URL.Query().Get("nivel")
	tipoFiltro := r.URL.Query().Get("tipo")

	response := make([]ExamenResumenDTO, 0, len(examenesDB))
	for _, e := range examenesDB {
		// Aplicar filtros dinámicos si se especificaron
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
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

// GET /api/v1/examenes/{id}
// Carga el examen completo con sus textos base (lecturas) y preguntas con opciones agrupadas.
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

	// 1. Consultar Examen
	examenDB, err := h.queries.GetExamenByID(ctx, pgUUID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Examen no encontrado"})
		return
	}

	// 2. Consultar Textos Base (Lecturas compartidas)
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

	// 3. Consultar Preguntas
	preguntasDB, err := h.queries.GetPreguntasByExamenID(ctx, pgUUID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "Error al cargar las preguntas"})
		return
	}

	// Recopilar IDs de preguntas para traer todas sus opciones en una sola consulta masiva
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

	// Agrupar opciones por ID de pregunta en un Map
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

	// Construir lista de preguntas DTO asociando sus opciones agrupadas
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
			UrlImagen:      p.UrlImagen.String,
			Opciones:       opciones,
		})
	}

	// 4. Armar DTO final de respuesta
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
