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
	intentoH := handler.NewIntentoHandler(queries) // Usaremos este para historial
	adminSubH := &handler.AdminSuscripcionesHandler{DB: queries}
	userSubH := &handler.SuscripcionUsuarioHandler{DB: queries}
	googleH := &handler.GoogleAuthHandler{DB: queries}

	r.Route("/api/v1", func(r chi.Router) {

		// 🔓 Rutas Públicas
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)

			// ESTAS SON LAS QUE DEBES AGREGAR AQUÍ:
			r.Post("/forgot-password", authH.ForgotPassword)
			r.Post("/reset-password", authH.ResetPassword)

			// OAuth
			r.Get("/google/login", googleH.GoogleLogin)
			r.Get("/google/callback", googleH.GoogleCallback)
		})

		// 🔒 Rutas Protegidas
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)

			r.Get("/examenes", examenH.ListarExamenes)
			r.Get("/me/suscripcion", userSubH.GetMiSuscripcion)

			r.With(auth.RequireSubscription(queries)).Get("/examenes/{id}", examenH.ObtenerExamenPorID)

			// --- INTENTOS & HISTORIAL (Usamos intentoH) ---
			r.Post("/intentos", intentoH.IniciarIntento)
			r.Get("/intentos", intentoH.ListarHistorial) // Historial
			r.Get("/intentos/{id}", intentoH.ObtenerIntentoPorID)
			r.Get("/intentos/{id}/resultados", intentoH.ObtenerResultadoDetalle) // Detalle pedagógico
			r.Post("/intentos/{id}/finalizar", intentoH.FinalizarIntento)

			// --- FAVORITOS (Usamos examenH) ---
			// Nota: Asegúrate de que estos métodos existan en tu examenH
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
