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

	// 1. Instanciamos todos los Handlers
	examenH := handler.NewExamenHandler(queries)
	authH := handler.NewAuthHandler(queries)
	intentoH := handler.NewIntentoHandler(queries)
	adminSubH := &handler.AdminSuscripcionesHandler{DB: queries}
	userSubH := &handler.SuscripcionUsuarioHandler{DB: queries}
	googleH := &handler.GoogleAuthHandler{DB: queries}
	analiticaH := handler.NewAnaliticaHandler(queries) // <-- NUEVO: Instancia de Analítica

	r.Route("/api/v1", func(r chi.Router) {

		// 🔓 Rutas Públicas
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)

			r.Post("/forgot-password", authH.ForgotPassword)
			r.Post("/reset-password", authH.ResetPassword)

			// OAuth
			r.Get("/google/login", googleH.GoogleLogin)
			r.Get("/google/callback", googleH.GoogleCallback)
		})

		// 🔒 Rutas Protegidas
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)

			// Perfil y Catálogo Base
			r.Get("/me/suscripcion", userSubH.GetMiSuscripcion)
			r.Get("/examenes", examenH.ListarExamenes)

			// --- EXÁMENES (Acceso con Suscripción) ---
			r.Route("/examenes/{id}", func(r chi.Router) {
				r.Use(auth.RequireSubscription(queries))

				r.Get("/", examenH.ObtenerExamenPorID)                      // Modo Simulacro (Normal)
				r.Get("/entrenamiento", examenH.GetExamenParaEntrenamiento) // MODO ENTRENAMIENTO (Nuevo 🚀)
			})

			// --- INTENTOS & HISTORIAL ---
			r.Route("/intentos", func(r chi.Router) {
				r.Post("/", intentoH.IniciarIntento)
				r.Get("/", intentoH.ListarHistorial)
				r.Get("/{id}", intentoH.ObtenerIntentoPorID)
				r.Get("/{id}/resultados", intentoH.ObtenerResultadoDetalle)
				r.Post("/{id}/finalizar", intentoH.FinalizarIntento)
			})

			// --- FAVORITOS ---
			r.Route("/favoritos", func(r chi.Router) {
				r.Get("/", examenH.ListarFavoritos)
				r.Post("/{id}", examenH.ToggleFavorito)
				r.Delete("/{id}", examenH.EliminarFavorito)
			})
			r.Post("/intentos", intentoH.IniciarIntento)
			r.Get("/intentos", intentoH.ListarHistorial)
			r.Get("/intentos/{id}", intentoH.ObtenerIntentoPorID)
			r.Get("/intentos/{id}/resultados", intentoH.ObtenerResultadoDetalle)
			r.Post("/intentos/{id}/finalizar", intentoH.FinalizarIntento)

			// --- ANALÍTICA ---
			// NUEVO: Rutas para las estadísticas y progreso del docente
			r.Get("/analitica/intento/{id}", analiticaH.ObtenerAnaliticaPorIntento)
			// r.Get("/analitica/progreso", analiticaH.ObtenerProgresoGlobal) // Descomentar cuando esté listo

			// --- FAVORITOS ---
			r.Get("/favoritos", examenH.ListarFavoritos)
			r.Post("/favoritos/{id}", examenH.ToggleFavorito)
			r.Delete("/favoritos/{id}", examenH.EliminarFavorito)

			// --- PANEL ADMINISTRADOR ---
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAdmin)
				r.Post("/admin/suscripciones/activar", adminSubH.Activar)
			})
		})
	})

	return r
}
