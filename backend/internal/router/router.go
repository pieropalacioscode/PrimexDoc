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

	// 1. Middlewares Basales (SIEMPRE primero, antes de cualquier ruta)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// 2. Rate Limiter Global (100 peticiones por minuto por IP)
	r.Use(httprate.LimitByIP(100, 1*time.Minute))

	// 3. Configuración CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://docentesmart.com", "https://www.docentesmart.com"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// 4. Instanciación de Handlers (ANTES de usarlos en las rutas)
	soporteH := &handler.SoporteHandler{Queries: queries}
	examenH := handler.NewExamenHandler(queries)
	authH := handler.NewAuthHandler(queries)
	intentoH := handler.NewIntentoHandler(queries)
	adminSubH := &handler.AdminSuscripcionesHandler{DB: queries}
	notifH := &handler.AdminNotificacionesHandler{DB: queries}
	userSubH := &handler.SuscripcionUsuarioHandler{DB: queries}
	googleH := &handler.GoogleAuthHandler{DB: queries}
	analiticaH := handler.NewAnaliticaHandler(queries)
	noticiaH := &handler.NoticiaHandler{DB: queries}

	// Rate limiter específico para soporte (evita spam de tickets)
	soporteLimiter := httprate.Limit(
		3,
		1*time.Hour,
		httprate.WithKeyFuncs(httprate.KeyByIP),
	)

	// 🚩 Rate limiter propio para rutas SEO (exámenes gratuitos + noticias)
	seoLimiter := httprate.LimitByIP(60, 1*time.Minute)

	// 🚩 Middleware de Cache-Control para contenido público indexable.
	cacheControlPublico := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
			next.ServeHTTP(w, r)
		})
	}

	r.Route("/api/v1", func(r chi.Router) {
		// Soporte: una sola ruta, con su propio rate limit (3/hora por IP)
		r.With(soporteLimiter).Post("/soporte/ticket", soporteH.CrearTicket)

		// 🚩 NOTICIAS: Públicas, sin auth, con rate limit propio (no el de /auth)
		r.Route("/noticias", func(r chi.Router) {
			r.Use(seoLimiter)
			r.Use(cacheControlPublico)
			r.Get("/", noticiaH.GetNoticias)
			r.Get("/{slug}", noticiaH.GetNoticiaBySlug)
		})

		// 🔓 Rutas Públicas de Auth (Protegidas con Rate Limit de 10 req/min por IP)
		r.Route("/auth", func(r chi.Router) {
			r.Use(httprate.LimitByIP(10, 1*time.Minute))
			r.Use(auth.RateLimitAuth)
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)
			r.Post("/forgot-password", authH.ForgotPassword)
			r.Post("/reset-password", authH.ResetPassword)

			// OAuth Google
			r.Get("/google/login", googleH.GoogleLogin)
			r.Get("/google/callback", googleH.GoogleCallback)
			r.Post("/google/exchange", googleH.GoogleExchange)
		})

		// 🔒 Rutas Protegidas (JWT Autenticado + Session Guard)
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)     // Capa 1: ¿Token válido?
			r.Use(authH.SessionGuard) // Capa 2: ¿Sesión activa en DB?

			// --- PERFIL & CATÁLOGO ---
			r.Get("/me", authH.GetProfile)
			r.Get("/auth/me", authH.GetProfile)
			r.Put("/me/telefono", authH.ActualizarMiTelefono)
			r.Get("/me/suscripcion", userSubH.GetMiSuscripcion)
			r.Get("/examenes", examenH.ListarExamenes)

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
				r.Get("/admin/users", adminSubH.ListarUsuarios)
				r.Post("/admin/users/{id}/renew", adminSubH.ExtenderSuscripcion)
				r.Put("/admin/users/{id}/telefono", notifH.ActualizarTelefono)
				r.Get("/admin/notificaciones/resumen", notifH.ResumenAlertas)
				r.Get("/admin/notificaciones/nuevos", notifH.ListarNuevos)
				r.Get("/admin/notificaciones/por-vencer", notifH.ListarPorVencer)
				r.Get("/admin/notificaciones/vencidos", notifH.ListarVencidos)
				r.Get("/admin/soporte/stats", soporteH.GetAlertasCount)
				r.Post("/admin/suscripciones/activar", adminSubH.Activar)
				r.Get("/admin/soporte/tickets", soporteH.ListarTickets)
			})
		})

		// 🚩 EXAMENES: UNA SOLA declaración de "/examenes/{id}" para TODO lo que
		// cuelga de ese id (GET directo + /entrenamiento). Antes existían DOS
		// registros distintos sobre el mismo patrón "/examenes/{id}" — uno aquí
		// (público/SEO) y otro dentro del Group protegido de arriba (usando
		// r.Route("/examenes/{id}", ...) solo para /entrenamiento). En chi,
		// r.Route()/Mount() registra un handler "catch-all" en el propio nodo
		// del patrón, no solo en sus hijos, así que el segundo registro
		// SOBRESCRIBÍA al primero en el árbol de rutas compartido (el Group no
		// aísla el árbol, solo el middleware). Resultado: todo GET /examenes/{id}
		// exacto caía en el subrouter que solo conocía "/entrenamiento" -> 404,
		// incluso con token válido y aunque el examen fuera gratuito.
		//
		// La fuente de verdad de qué IDs son gratuitos sigue siendo
		// auth.ExamenesGratuitos (internal/auth/examenes_gratuitos.go), la misma
		// que usa el frontend en EXAMENES_GRATUITOS_IDS.
		r.Route("/examenes/{id}", func(r chi.Router) {

			// GET /api/v1/examenes/{id}
			r.With(seoLimiter, cacheControlPublico).Get("/", func(w http.ResponseWriter, r *http.Request) {
				examenID := chi.URLParam(r, "id")

				// Caso 1: examen gratuito -> acceso directo, sin token, con cache pública
				if auth.ExamenesGratuitos[examenID] {
					examenH.ObtenerExamenPorID(w, r)
					return
				}

				// Caso 2: examen normal -> exigimos JWT + sesión + suscripción
				protectedChain := authMiddleware(
					authH.SessionGuard(
						auth.RequireSubscription(queries)(
							http.HandlerFunc(examenH.ObtenerExamenPorID),
						),
					),
				)
				protectedChain.ServeHTTP(w, r)
			})

			// GET /api/v1/examenes/{id}/entrenamiento (siempre requiere sesión + suscripción)
			r.Group(func(r chi.Router) {
				r.Use(authMiddleware)
				r.Use(authH.SessionGuard)
				r.Use(auth.RequireSubscription(queries))
				r.Get("/entrenamiento", examenH.GetExamenParaEntrenamiento)
			})
		})
	})

	return r
}
