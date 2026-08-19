package handler

import (
	"encoding/json"
	"net/http"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type AnaliticaHandler struct {
	queries *db.Queries
}

func NewAnaliticaHandler(queries *db.Queries) *AnaliticaHandler {
	return &AnaliticaHandler{queries: queries}
}

// GET /api/v1/analitica/intento/{id}
func (h *AnaliticaHandler) ObtenerAnaliticaPorIntento(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Extraer UserID
	userIDStr, ok := auth.GetUserID(ctx)
	if !ok {
		http.Error(w, `{"error":"No autorizado"}`, http.StatusUnauthorized)
		return
	}

	// 2. Validar Intento ID
	intentoIDStr := chi.URLParam(r, "id")
	intentoID, err := uuid.Parse(intentoIDStr)
	if err != nil {
		http.Error(w, `{"error":"ID de intento inválido"}`, http.StatusBadRequest)
		return
	}

	pgIntentoID := pgtype.UUID{Bytes: intentoID, Valid: true}

	// 3. SEGURIDAD: Verificar que el intento pertenece al usuario
	intentoDB, err := h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
		ID:        pgIntentoID,
		UsuarioID: pgtype.UUID{Bytes: uuid.MustParse(userIDStr), Valid: true},
	})
	if err != nil {
		http.Error(w, `{"error":"Intento no encontrado o no pertenece al usuario"}`, http.StatusForbidden)
		return
	}
	_ = intentoDB // Ignoramos el detalle por ahora, solo validamos existencia

	// 4. Consultar Analítica
	subpruebasDB, err := h.queries.ObtenerAnaliticaPorIntento(ctx, pgIntentoID)
	if err != nil {
		http.Error(w, `{"error":"Error al procesar subpruebas: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	componentesDB, err := h.queries.ObtenerAnaliticaDetalladaPorComponente(ctx, pgIntentoID)
	if err != nil {
		http.Error(w, `{"error":"Error al procesar temas: `+err.Error()+`"}`, http.StatusInternalServerError)
		return
	}

	// 5. Lógica de Negocio: Identificar Debilidades y Recomendación
	var debilidades []string
	var peorSubprueba string
	var menorPorcentaje float64 = 101.0

	resumenSub := make([]AnaliticaResumen, 0)
	for _, s := range subpruebasDB {
		// CORRECCIÓN DE TIPOS:
		// Convertimos int32 a float64
		porcentaje := float64(s.PorcentajeExito)
		// Extraemos el string puro del pgtype.Text
		subpruebaStr := s.Subprueba.String

		resumenSub = append(resumenSub, AnaliticaResumen{
			Subprueba:       subpruebaStr,
			TotalPreguntas:  s.TotalPreguntas,
			Correctas:       s.Correctas,
			PorcentajeExito: porcentaje,
		})

		if porcentaje < menorPorcentaje {
			menorPorcentaje = porcentaje
			peorSubprueba = subpruebaStr
		}
	}

	resumenComp := make([]ComponenteResumen, 0)
	for _, c := range componentesDB {
		// Extraemos el string puro del pgtype.Text
		componenteStr := c.Componente.String

		resumenComp = append(resumenComp, ComponenteResumen{
			Componente: componenteStr,
			Total:      c.Total,
			Aciertos:   c.Aciertos,
		})

		// Si el éxito en este tema es menor al 50%, es una debilidad
		if c.Total > 0 && (float64(c.Aciertos)/float64(c.Total)) < 0.5 {
			debilidades = append(debilidades, componenteStr)
		}
	}

	// Generar recomendación dinámica
	recomendacion := "¡Buen trabajo! Sigue practicando para mantener tu nivel."
	if menorPorcentaje < 60 {
		recomendacion = "Te sugerimos reforzar el área de " + peorSubprueba + ", ya que es donde tienes mayor oportunidad de mejora."
	}

	// 6. Respuesta Final
	response := AnaliticaIntentoDTO{
		IntentoID:     intentoID,
		PorSubprueba:  resumenSub,
		PorComponente: resumenComp,
		Debilidades:   debilidades,
		Recomendacion: recomendacion,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
