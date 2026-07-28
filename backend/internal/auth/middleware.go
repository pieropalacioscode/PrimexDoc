package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"github.com/alienwarecode/docent-primex-api/internal/db" // ¡Esta es la importación que faltaba!
	"github.com/jackc/pgx/v5/pgtype"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	CorreoKey contextKey = "correo"
	RolKey    contextKey = "rol"
)

// JWTMiddleware valida el token Bearer en peticiones privadas
func JWTMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"Se requiere encabezado Authorization"}`, http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, `{"error":"Formato de token inválido (debe ser 'Bearer ')"}`, http.StatusUnauthorized)
			return
		}

		jwtSecret := os.Getenv("JWT_SECRET")
		if jwtSecret == "" {
			jwtSecret = "secret_fallback_dev"
		}

		claims, err := ValidarToken(parts[1], jwtSecret)
		if err != nil {
			http.Error(w, `{"error":"Token no válido o expirado"}`, http.StatusUnauthorized)
			return
		}

		// Adjuntar identidad del docente al context
		ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, CorreoKey, claims.Correo)
		ctx = context.WithValue(ctx, RolKey, claims.Rol)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserID extrae el ID del usuario del contexto de forma segura
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}

// GetUserRole extrae el rol del usuario del contexto
func GetUserRole(ctx context.Context) (string, bool) {
	rol, ok := ctx.Value(RolKey).(string)
	return rol, ok
}

// RequireAdmin bloquea cualquier petición que no venga de un rol 'admin'
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rol, ok := GetUserRole(r.Context())

		if !ok || rol != "admin" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Acceso denegado. Se requieren permisos de administrador.",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// PaywallError define la estructura del error
type PaywallError struct {
	Error     string `json:"error"`
	Code      string `json:"code"`
	ActionURL string `json:"action_url"`
}

// RequireSubscription intercepta intentos de acceso a exámenes premium
func RequireSubscription(queries *db.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userIDStr, ok := GetUserID(r.Context())
			if !ok {
				http.Error(w, `{"error": "Usuario no autenticado"}`, http.StatusUnauthorized)
				return
			}

			var userUUID pgtype.UUID
			if err := userUUID.Scan(userIDStr); err != nil {
				http.Error(w, `{"error": "ID de usuario inválido"}`, http.StatusBadRequest)
				return
			}

			hasActiveSub, err := queries.CheckActiveSubscription(r.Context(), userUUID)
			if err != nil || !hasActiveSub {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusForbidden)

				json.NewEncoder(w).Encode(PaywallError{
					Error:     "Requiere plan premium",
					Code:      "PAYWALL_ACTIVE",
					ActionURL: "https://wa.me/51999999999?text=Hola,deseo_activar_mi_plan",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
