// backend/internal/auth/middleware.go
package auth

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// contextKey es un tipo privado para evitar colisiones con claves de
// context.Context definidas en otros paquetes.
type contextKey string

const (
	UserIDKey contextKey = "user_id"
	CorreoKey contextKey = "correo"
	RolKey    contextKey = "rol"

	// RolAdmin es el único rol con acceso administrativo total.
	RolAdmin = "admin"

	bearerScheme = "Bearer"
)

// ExamenesGratuitos contiene los IDs (UUID) de los exámenes freemium
// a los que cualquier usuario registrado puede acceder sin pagar.
// var ExamenesGratuitos = map[string]bool{
// 	"a7aac235-c5a1-498a-b69e-0e01b2edd487": true,
// 	"faf6dadc-e9b8-41c5-8cb3-2d88e204336b": true,
// }

// writeJSONError centraliza el formato de respuesta de error para que
// todos los middlewares devuelvan siempre {"error": ..., "code": ...}.
func writeJSONError(w http.ResponseWriter, status int, code, mensaje string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": mensaje,
		"code":  code,
	})
}

// JWTMiddleware valida el token Bearer en peticiones privadas y adjunta
// la identidad del docente (user_id, correo, rol) al context.
func JWTMiddleware(next http.Handler) http.Handler {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("❌ JWT_SECRET no está definido. Configúralo antes de iniciar el servidor.")
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeJSONError(w, http.StatusUnauthorized, "MISSING_AUTH_HEADER", "Se requiere encabezado Authorization")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], bearerScheme) {
			writeJSONError(w, http.StatusUnauthorized, "INVALID_AUTH_FORMAT", "Formato de token inválido (debe ser 'Bearer <token>')")
			return
		}

		token := strings.TrimSpace(parts[1])
		if token == "" {
			writeJSONError(w, http.StatusUnauthorized, "INVALID_AUTH_FORMAT", "Token vacío")
			return
		}

		claims, err := ValidarToken(token, jwtSecret)
		if err != nil {
			writeJSONError(w, http.StatusUnauthorized, "INVALID_TOKEN", "Token no válido o expirado")
			return
		}

		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, CorreoKey, claims.Correo)
		ctx = context.WithValue(ctx, RolKey, claims.Rol)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID extrae el ID del usuario autenticado del contexto.
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}

// GetCorreo extrae el correo del usuario autenticado del contexto.
func GetCorreo(ctx context.Context) (string, bool) {
	correo, ok := ctx.Value(CorreoKey).(string)
	return correo, ok
}

// GetUserRole extrae el rol del usuario autenticado del contexto.
func GetUserRole(ctx context.Context) (string, bool) {
	rol, ok := ctx.Value(RolKey).(string)
	return rol, ok
}

// RequireAdmin bloquea cualquier petición cuyo token no tenga rol 'admin'.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rol, ok := GetUserRole(r.Context())
		if !ok || rol != RolAdmin {
			correo, _ := GetCorreo(r.Context())
			log.Printf("🛑 ACCESO NO AUTORIZADO: intento de entrar a zona Admin por %q", correo)
			writeJSONError(w, http.StatusForbidden, "ADMIN_REQUIRED", "Acceso denegado. Se requieren permisos de administrador.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// PaywallError es el cuerpo JSON que recibe el frontend cuando el
// usuario no tiene una suscripción activa.
type PaywallError struct {
	Error     string `json:"error"`
	Code      string `json:"code"`
	ActionURL string `json:"action_url"`
}

// RequireSubscription verifica que el usuario autenticado tenga un plan activo.
func RequireSubscription(queries *db.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// --- NUEVO: BYPASS FREEMIUM ---
			// Extraemos el parámetro {id} de la ruta utilizando chi.
			examenID := chi.URLParam(r, "id")

			// Si el examen existe en nuestro mapa de gratuitos, damos acceso inmediato.
			if examenID != "" && ExamenesGratuitos[examenID] {
				next.ServeHTTP(w, r)
				return
			}
			// ------------------------------

			userIDStr, ok := GetUserID(r.Context())
			if !ok {
				writeJSONError(w, http.StatusUnauthorized, "NOT_AUTHENTICATED", "Usuario no autenticado")
				return
			}

			parsedID, err := uuid.Parse(userIDStr)
			if err != nil {
				writeJSONError(w, http.StatusBadRequest, "INVALID_USER_ID", "ID de usuario inválido")
				return
			}
			userUUID := pgtype.UUID{Bytes: parsedID, Valid: true}

			usuario, err := queries.GetUsuarioByID(r.Context(), userUUID)
			if err != nil {
				log.Printf("❌ Error consultando usuario %s: %v", userIDStr, err)
				writeJSONError(w, http.StatusInternalServerError, "USER_LOOKUP_FAILED", "Error al verificar permisos")
				return
			}

			// Bypass inmediato para administradores.
			if usuario.Rol.String == RolAdmin {
				next.ServeHTTP(w, r)
				return
			}

			ahora := time.Now().UTC()
			estaActivo := usuario.SuscripcionHasta.Valid && usuario.SuscripcionHasta.Time.UTC().After(ahora)

			if !estaActivo {
				vencimiento := "sin registrar"
				if usuario.SuscripcionHasta.Valid {
					vencimiento = usuario.SuscripcionHasta.Time.UTC().Format("2006-01-02")
				}
				log.Printf("⚠️ ACCESO DENEGADO: %s | Vence: %s", usuario.Correo, vencimiento)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)
				_ = json.NewEncoder(w).Encode(PaywallError{
					Error:     "Requiere plan premium",
					Code:      "PAYWALL_ACTIVE",
					ActionURL: "https://wa.me/pieropalacios.neo?text=Hola,deseo_activar_mi_plan",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Crear una utilidad de log sensible
func logSecure(mensaje string, email string) {
	if os.Getenv("ENV") == "production" {
		parts := strings.Split(email, "@")
		// docente@gmail.com -> d***@gmail.com
		masked := string(parts[0][0]) + "***@" + parts[1]
		log.Printf("%s: %s", mensaje, masked)
	} else {
		log.Printf("%s: %s", mensaje, email)
	}
}
