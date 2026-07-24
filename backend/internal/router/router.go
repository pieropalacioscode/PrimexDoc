package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/handler"
)

func NewRouter(h *handler.Handler) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "https://docentesmart.com"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", h.HealthCheck)

	r.Route("/api/v1", func(r chi.Router) {
		// Rutas Públicas
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", h.Register)
			r.Post("/login", h.Login)
		})

		// Rutas Protegidas (Requieren JWT)
		r.Group(func(r chi.Router) {
			r.Use(auth.JWTMiddleware)
			
			r.Get("/me", h.GetProfile)
			// Aquí montaremos más adelante: /examenes, /intentos, etc.
		})
	})

	return r
}