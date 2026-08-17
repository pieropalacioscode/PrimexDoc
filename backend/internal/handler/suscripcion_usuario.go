package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type SuscripcionUsuarioHandler struct {
	DB *db.Queries
}

func (h *SuscripcionUsuarioHandler) GetMiSuscripcion(w http.ResponseWriter, r *http.Request) {
	userIDStr, ok := auth.GetUserID(r.Context())
	if !ok {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	parsedID, _ := uuid.Parse(userIDStr)
	pgUserID := pgtype.UUID{Bytes: parsedID, Valid: true}

	usuario, err := h.DB.GetUsuarioByID(r.Context(), pgUserID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	// Lógica robusta: Comparar con tiempo UTC para evitar problemas de zona horaria del servidor
	ahora := time.Now().UTC()
	fechaVencimiento := usuario.SuscripcionHasta.Time.UTC()
	
	// El usuario es activo si la fecha es válida Y es mayor a "ahora"
	estaActivo := usuario.SuscripcionHasta.Valid && fechaVencimiento.After(ahora)

	// LOG PROFESIONAL PARA AUDITORÍA EN TERMINAL
	fmt.Printf("[SUSCRIPCIÓN] Usuario: %s | ID: %s | Estado: %v | Vence: %s\n", 
		usuario.Correo, userIDStr, estaActivo, fechaVencimiento.Format("2006-01-02 15:04:05"))

	w.Header().Set("Content-Type", "application/json")
	// Enviamos campos redundantes para asegurar compatibilidad con el Frontend
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "activo":            estaActivo,      // Nombre técnico
        "tiene_acceso":      estaActivo,      // Mapeo para el Frontend actual 👈 AGREGA ESTO
        "suscripcion_hasta": usuario.SuscripcionHasta.Time,
        "correo":            usuario.Correo,
        "nombre":            usuario.NombreCompleto,
})
}