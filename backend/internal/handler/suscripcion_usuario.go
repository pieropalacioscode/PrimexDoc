package handler

import (
	"encoding/json"
	"net/http"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type SuscripcionUsuarioHandler struct {
	DB *db.Queries
}

func (h *SuscripcionUsuarioHandler) GetMiSuscripcion(w http.ResponseWriter, r *http.Request) {
	// 1. Obtener ID del usuario desde el JWT
	userIDStr, ok := auth.GetUserID(r.Context())
	if !ok {
		http.Error(w, `{"error": "No autorizado"}`, http.StatusUnauthorized)
		return
	}

	var userUUID pgtype.UUID
	if err := userUUID.Scan(userIDStr); err != nil {
		http.Error(w, `{"error": "ID inválido"}`, http.StatusBadRequest)
		return
	}

	// 2. Consultar la suscripción activa usando el query generado por sqlc
	sub, err := h.DB.GetSuscripcionActiva(r.Context(), userUUID)

	w.Header().Set("Content-Type", "application/json")

	if err == pgx.ErrNoRows {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"tiene_acceso": false,
			"mensaje":      "No tienes una suscripción activa",
		})
		return
	} else if err != nil {
		http.Error(w, `{"error": "Error interno al verificar suscripción"}`, http.StatusInternalServerError)
		return
	}

	// 3. Devolver los datos del plan activo al docente
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tiene_acceso":     true,
		"plan":             sub.Plan,
		"fecha_expiracion": sub.FechaExpiracion.Time,
	})
}
