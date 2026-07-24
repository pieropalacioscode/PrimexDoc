package handler
//Endpoint para consultar perfil del docente autenticado
import (
	"net/http"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
)

// GetProfile devuelve los datos del docente basándose en el JWT del contexto
func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value(auth.UserIDKey).(string)
	correo, _ := r.Context().Value(auth.CorreoKey).(string)
	rol, _ := r.Context().Value(auth.RolKey).(string)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":     userID,
		"correo": correo,
		"rol":    rol,
	})
}