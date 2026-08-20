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

func (h *AnaliticaHandler) ObtenerAnaliticaPorIntento(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Seguridad: Extraer UserID del JWT
	userIDStr, ok := auth.GetUserID(ctx)
	if !ok {
		enviarError(w, "No autorizado", http.StatusUnauthorized)
		return
	}

	userUUID, err := uuid.Parse(userIDStr)
	if err != nil {
		enviarError(w, "Usuario inválido", http.StatusUnauthorized)
		return
	}

	// 2. Validar ID de Intento
	intentoIDStr := chi.URLParam(r, "id")
	intentoID, err := uuid.Parse(intentoIDStr)
	if err != nil {
		enviarError(w, "ID de intento inválido", http.StatusBadRequest)
		return
	}

	pgIntentoID := pgtype.UUID{Bytes: intentoID, Valid: true}
	pgUsuarioID := pgtype.UUID{Bytes: userUUID, Valid: true}

	// 3. Verificar pertenencia del intento (Seguridad)
	_, err = h.queries.ObtenerIntentoPorID(ctx, db.ObtenerIntentoPorIDParams{
		ID:        pgIntentoID,
		UsuarioID: pgUsuarioID,
	})
	if err != nil {
		enviarError(w, "Intento no encontrado o acceso denegado", http.StatusForbidden)
		return
	}

	// 4. EJECUTAR QUERIES (Nombres sincronizados con tu Querier.go)
	// ObtenerAnaliticaPorIntento -> Para el Radar
	rowsSub, err := h.queries.ObtenerAnaliticaPorIntento(ctx, pgIntentoID)
	if err != nil {
		enviarError(w, "Error en Subpruebas: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// ObtenerAnaliticaDetalladaPorComponente -> Para el Semáforo
	rowsComp, err := h.queries.ObtenerAnaliticaDetalladaPorComponente(ctx, pgIntentoID)
	if err != nil {
		enviarError(w, "Error en Componentes: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 5. Mapear Subpruebas a DTO (Radar)
	resumenSub := make([]AnaliticaData, 0, len(rowsSub))
	var peorArea string
	var minP float64 = 101.0

	for _, fila := range rowsSub {
		p := float64(fila.PorcentajeExito)

		resumenSub = append(resumenSub, AnaliticaData{
			Area:       fila.Subprueba.String,
			Total:      fila.TotalPreguntas,
			Aciertos:   fila.Correctas,
			Porcentaje: p,
		})

		if p < minP {
			minP = p
			peorArea = fila.Subprueba.String
		}
	}

	// 6. Mapear Componentes a DTO (Semáforo)
	resumenComp := make([]ComponenteData, 0, len(rowsComp))
	debilidades := make([]string, 0)

	for _, fila := range rowsComp {
		p := float64(fila.Aciertos)

		resumenComp = append(resumenComp, ComponenteData{
			Subprueba:  "", // Esta query no trae la subprueba en el struct
			Componente: fila.Componente.String,
			Total:      fila.Total,
			Aciertos:   fila.Aciertos,
			Porcentaje: p,
		})

		if p < 50 {
			debilidades = append(debilidades, fila.Componente.String)
		}
	}

	// 7. Recomendación Smart
	recomendacion := "¡Buen trabajo! Sigue practicando."
	if len(debilidades) > 0 {
		recomendacion = "Te sugerimos reforzar " + peorArea + ", especialmente en: " + debilidades[0]
	}

	// 8. Enviar Respuesta
	response := AnaliticaFullResponse{
		IntentoID:     intentoID,
		Subpruebas:    resumenSub,
		Componentes:   resumenComp,
		Debilidades:   debilidades,
		Recomendacion: recomendacion,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func enviarError(w http.ResponseWriter, mensaje string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": mensaje})
}
