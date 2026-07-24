package auth

import (
	"context"
	"net/http"
	"os"
	"strings"
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