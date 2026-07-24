package handler

import (
	"encoding/json"
	"net/http"
)

type Response struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

// HealthCheck responde con el estado actual del servicio
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(Response{
		Status:  "ok",
		Message: "Plataforma Docente Smart - PRIMEX API activa y saludable",
	})
}