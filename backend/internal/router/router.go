// backend > internal > router > router.go
package router

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/alienwarecode/docent-primex-api/internal/handler"
)

func NewRouter(queries *db.Queries, authMiddleware func(http.Handler) http.Handler) *chi.Mux {
	r := chi.NewRouter()

	// 1. Middlewares Basales
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// 2. Rate Limiter Global (100 peticiones por minuto por IP)
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	// 3. Configuración CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// 4. Instanciación de Handlers
	examenH := handler.NewExamenHandler(queries)
	authH := handler.NewAuthHandler(queries)
	intentoH := handler.NewIntentoHandler(queries)
	adminSubH := &handler.AdminSuscripcionesHandler{DB: queries}
	userSubH := &handler.SuscripcionUsuarioHandler{DB: queries}
	googleH := &handler.GoogleAuthHandler{DB: queries}
	analiticaH := handler.NewAnaliticaHandler(queries)

	r.Route("/api/v1", func(r chi.Router) {

		// 🔓 Rutas Públicas (Protegidas con Rate Limit de 10 req/min por IP)
		r.Route("/auth", func(r chi.Router) {
			r.Use(httprate.LimitByIP(10, 1*time.Minute)) // Protección contra Fuerza Bruta

			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)
			r.Post("/forgot-password", authH.ForgotPassword)
			r.Post("/reset-password", authH.ResetPassword)

			// OAuth Google
			r.Get("/google/login", googleH.GoogleLogin)
			r.Get("/google/callback", googleH.GoogleCallback)
		})

		// 🔒 Rutas Protegidas (JWT Autenticado)
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)

			// Perfil y Catálogo Base
			r.Get("/me", authH.GetProfile)
			r.Get("/me/suscripcion", userSubH.GetMiSuscripcion)
			r.Get("/examenes", examenH.ListarExamenes)

			// --- EXÁMENES (Acceso controlado por Suscripción / Paywall) ---
			r.Route("/examenes/{id}", func(r chi.Router) {
				r.Use(auth.RequireSubscription(queries))

				r.Get("/", examenH.ObtenerExamenPorID)                      // Modo Simulacro
				r.Get("/entrenamiento", examenH.GetExamenParaEntrenamiento) // Modo Entrenamiento 🚀
			})

			// --- INTENTOS & HISTORIAL ---
			r.Route("/intentos", func(r chi.Router) {
				r.Post("/", intentoH.IniciarIntento)
				r.Get("/", intentoH.ListarHistorial)
				r.Get("/{id}", intentoH.ObtenerIntentoPorID)
				r.Get("/{id}/resultados", intentoH.ObtenerResultadoDetalle)
				r.Post("/{id}/finalizar", intentoH.FinalizarIntento)
				r.Delete("/{id}", intentoH.EliminarIntento)
			})

			// --- FAVORITOS ---
			r.Route("/favoritos", func(r chi.Router) {
				r.Get("/", examenH.ListarFavoritos)
				r.Post("/{id}", examenH.ToggleFavorito)
				r.Delete("/{id}", examenH.EliminarFavorito)
			})

			// --- ANALÍTICA ---
			r.Get("/analitica/intento/{id}", analiticaH.ObtenerAnaliticaPorIntento)
			// r.Get("/analitica/progreso", analiticaH.ObtenerProgresoGlobal) // Descomentar al integrar

			// --- PANEL ADMINISTRADOR ---
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAdmin)
				r.Get("/admin/users", adminSubH.ListarUsuarios)           // <--- AÑADIR ESTA LÍNEA
				r.Post("/admin/users/{id}/renew", adminSubH.ExtenderSuscripcion) // <--- AÑADIR ESTA LÍNEA
				r.Post("/admin/suscripciones/activar", adminSubH.Activar)
			})
		})
	})

	return r
}
