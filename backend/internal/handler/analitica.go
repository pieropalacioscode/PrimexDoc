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

// AnaliticaHandler maneja las peticiones de estadísticas
type AnaliticaHandler struct {
	queries *db.Queries
}

// NewAnaliticaHandler crea una nueva instancia del handler
func NewAnaliticaHandler(queries *db.Queries) *AnaliticaHandler {
	return &AnaliticaHandler{queries: queries}
}

// ObtenerAnaliticaPorIntento procesa la analítica de un examen
func (h *AnaliticaHandler) ObtenerAnaliticaPorIntento(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	intentoID, _ := uuid.Parse(chi.URLParam(r, "id"))
	
	// 1. Seguridad: Extraer UserID del JWT
	userIDStr, ok := auth.GetUserID(ctx) 
	if !ok {
		enviarError(w, "No autorizado", http.StatusUnauthorized)
		return
	}

	pgIntentoID := pgtype.UUID{Bytes: intentoID, Valid: true}
	pgUsuarioID := pgtype.UUID{Bytes: uuid.MustParse(userIDStr), Valid: true}

	// 2. Verificar que el intento pertenece al usuario
	_, err := h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
		ID:        pgIntentoID,
		UsuarioID: pgUsuarioID,
	})
	if err != nil {
		enviarError(w, "Intento no encontrado o acceso denegado", http.StatusForbidden)
		return
	}

	// 3. Ejecutar Queries de SQLC
	rowsSub, err := h.queries.ObtenerAnaliticaPorIntento(ctx, pgIntentoID)
	if err != nil {
		enviarError(w, "Error en Subpruebas: "+err.Error(), 500)
		return
	}

	rowsComp, err := h.queries.ObtenerAnaliticaDetalladaPorComponente(ctx, pgIntentoID)
	if err != nil {
		enviarError(w, "Error en Componentes: "+err.Error(), 500)
		return
	}

	// 4. Procesar Subpruebas (Radar)
	resumenSub := make([]AnaliticaData, 0)
	var peorArea string
	var minP float64 = 101.0

	for _, r := range rowsSub {
		// Asignamos a variables locales para que la lógica de abajo funcione
		areaStr := r.Subprueba
		porcentaje := r.PorcentajeExito

		resumenSub = append(resumenSub, AnaliticaData{
			Area:       areaStr,
			Total:      r.TotalPreguntas,
			Aciertos:   r.Correctas,
			Porcentaje: porcentaje,
		})

		// Lógica para encontrar el área más débil
		if porcentaje < minP {
			minP = porcentaje
			peorArea = areaStr
		}
	}

	// 5. Procesar Componentes (Semáforo)
	resumenComp := make([]ComponenteData, 0)
	debilidades := make([]string, 0)

	for _, r := range rowsComp {
		compStr := r.Componente
		porcentajeComp := r.Porcentaje

		resumenComp = append(resumenComp, ComponenteData{
			Componente: compStr,
			Total:      r.Total,
			Aciertos:   r.Aciertos,
			Porcentaje: porcentajeComp,
		})

		// Si el dominio es bajo, lo agregamos a debilidades
		if porcentajeComp < 50.0 {
			debilidades = append(debilidades, compStr)
		}
	}

	// 6. Recomendación Smart
	rec := "¡Buen trabajo! Has demostrado solidez en las áreas evaluadas."
	if len(debilidades) > 0 {
		rec = "Hemos identificado temas donde puedes mejorar. Te sugerimos reforzar: " + peorArea
	}

	// 7. Respuesta JSON final
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AnaliticaFullResponse{
		IntentoID:     intentoID,
		Subpruebas:    resumenSub,
		Componentes:   resumenComp,
		Debilidades:   debilidades,
		Recomendacion: rec,
	})
}

// enviarError responde un error en formato JSON consistente.
func enviarError(w http.ResponseWriter, mensaje string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": mensaje})
}