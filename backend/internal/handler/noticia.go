package handler

import (
	"net/http"
	"strconv"

	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/go-chi/chi/v5"
)

type NoticiaHandler struct {
	DB *db.Queries
}

func (h *NoticiaHandler) GetNoticias(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	if limit == 0 {
		limit = 10
	}

	noticias, err := h.DB.ListarNoticias(r.Context(), db.ListarNoticiasParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al listar noticias")
		return
	}

	respondWithJSON(w, http.StatusOK, noticias)
}

func (h *NoticiaHandler) GetNoticiaBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")

	noticia, err := h.DB.ObtenerNoticiaPorSlug(r.Context(), slug)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Noticia no encontrada")
		return
	}

	// Incrementar vistas en segundo plano (no bloquea al usuario)
	go h.DB.IncrementarVistasNoticia(r.Context(), slug)

	respondWithJSON(w, http.StatusOK, noticia)
}
