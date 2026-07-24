package handler

import (
	"github.com/alienwarecode/docent-primex-api/internal/db"
)

// Handler agrupa las dependencias necesarias para los controladores HTTP
type Handler struct {
	DB *db.Queries
}

// NewHandler crea una nueva instancia del contenedor de handlers
func NewHandler(queries *db.Queries) *Handler {
	return &Handler{
		DB: queries,
	}
}