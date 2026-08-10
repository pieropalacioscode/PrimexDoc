package handler

import (
	"encoding/json"
	"net/http"

	"github.com/alienwarecode/docent-primex-api/internal/db" // Ajusta según tu repo
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type HistorialHandler struct {
	queries *db.Queries
}

func NewHistorialHandler(queries *db.Queries) *HistorialHandler {
	return &HistorialHandler{queries: queries}
}

// GET /api/v1/historial
func (h *HistorialHandler) ListarHistorial(w http.ResponseWriter, r *http.Request) {
	// Extraer usuario_id del contexto (JWT Middleware ya lo puso ahí)
	userID := r.Context().Value("user_id").(uuid.UUID)
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	intentos, err := h.queries.ListarIntentosPorUsuario(r.Context(), pgUserID)
	if err != nil {
		http.Error(w, "Error al obtener historial", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(intentos)
}

// GET /api/v1/historial/{id}/detalle
func (h *HistorialHandler) ObtenerDetalleResultado(w http.ResponseWriter, r *http.Request) {
	intentoIDStr := chi.URLParam(r, "id")
	intentoID, _ := uuid.Parse(intentoIDStr)
	pgIntentoID := pgtype.UUID{Bytes: intentoID, Valid: true}

	detalle, err := h.queries.ObtenerDetalleResultado(r.Context(), pgIntentoID)
	if err != nil {
		http.Error(w, "Error al obtener detalle", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(detalle)
}
