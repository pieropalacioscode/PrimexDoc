package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/alienwarecode/docent-primex-api/internal/handler"
)

func NewRouter(queries *db.Queries, authMiddleware func(http.Handler) http.Handler) *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Instanciamos todos los Handlers
	examenH := handler.NewExamenHandler(queries)
	authH := handler.NewAuthHandler(queries)
	intentoH := handler.NewIntentoHandler(queries)
	adminSubH := &handler.AdminSuscripcionesHandler{DB: queries}
	userSubH := &handler.SuscripcionUsuarioHandler{DB: queries}
	googleH := &handler.GoogleAuthHandler{DB: queries}

	r.Route("/api/v1", func(r chi.Router) {

		// 🔓 Rutas Públicas (Autenticación Tradicional y Google OAuth)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)

			// Endpoints de Google OAuth 2.0
			r.Get("/google/login", googleH.GoogleLogin)
			r.Get("/google/callback", googleH.GoogleCallback)
		})

		// 🔒 Rutas Protegidas (Requieren Login con JWT)
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)

			// --- CATÁLOGO & SUSCRIPCIÓN DE USUARIO ---
			r.Get("/examenes", examenH.ListarExamenes)
			r.Get("/me/suscripcion", userSubH.GetMiSuscripcion)

			// --- EXÁMENES (Protegido por Paywall) ---
			r.With(auth.RequireSubscription(queries)).Get("/examenes/{id}", examenH.ObtenerExamenPorID)

			// --- INTENTOS ---
			r.Post("/intentos", intentoH.IniciarIntento)
			r.Get("/intentos", intentoH.ListarHistorial)
			r.Get("/intentos", intentoH.ListarIntentos)
			r.Get("/intentos/{id}", intentoH.ObtenerIntentoPorID)
			r.Get("/intentos/{id}/resultados", intentoH.ObtenerResultadoDetalle)
			r.Post("/intentos/{id}/finalizar", intentoH.FinalizarIntento)
			r.Get("/intentos/{id}/resultados", intentoH.ObtenerResultados) // 👈 NUEVA RUTA FASE 9

			// --- PANEL ADMINISTRADOR ---
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAdmin)
				r.Post("/admin/suscripciones/activar", adminSubH.Activar)
			})
		})
	})

	return r
}
