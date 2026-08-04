package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
)

type GoogleAuthHandler struct {
	DB *db.Queries
}

func NewGoogleAuthHandler(queries *db.Queries) *GoogleAuthHandler {
	return &GoogleAuthHandler{DB: queries}
}

func getGoogleConfig() *oauth2.Config {
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:8080/api/v1/auth/google/callback"
	}

	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  redirectURL,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

// GoogleLogin redirige al usuario a la pantalla de consentimiento de Google
func (h *GoogleAuthHandler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	conf := getGoogleConfig()
	url := conf.AuthCodeURL("state-primex-secure", oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

type GoogleUser struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

// GoogleCallback procesa la respuesta de Google, guarda/obtiene el usuario y redirige al frontend
func (h *GoogleAuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, `{"error": "Código de autorización de Google no proporcionado"}`, http.StatusBadRequest)
		return
	}

	conf := getGoogleConfig()
	token, err := conf.Exchange(ctx, code)
	if err != nil {
		http.Error(w, `{"error": "Fallo al intercambiar el token con Google"}`, http.StatusInternalServerError)
		return
	}

	client := conf.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		http.Error(w, `{"error": "Fallo al obtener perfil del usuario desde Google"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var gUser GoogleUser
	if err := json.NewDecoder(resp.Body).Decode(&gUser); err != nil {
		http.Error(w, `{"error": "Fallo al procesar datos del usuario"}`, http.StatusInternalServerError)
		return
	}

	// Buscar o crear usuario en la BD con sqlc
	dbUser, err := h.DB.GetOrCreateUserByEmail(ctx, db.GetOrCreateUserByEmailParams{
		Correo:         gUser.Email,
		NombreCompleto: gUser.Name,
	})
	if err != nil {
		http.Error(w, `{"error": "Error interno al registrar usuario"}`, http.StatusInternalServerError)
		return
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "secret_fallback_dev"
	}

	rolStr := dbUser.Rol.String
	if rolStr == "" {
		rolStr = "usuario"
	}

	appToken, err := auth.GenerarToken(dbUser.ID.String(), dbUser.Correo, rolStr, dbUser.NombreCompleto, jwtSecret)
	if err != nil {
		http.Error(w, `{"error": "Error al emitir sesión"}`, http.StatusInternalServerError)
		return
	}

	// Redirigir de vuelta al Frontend pasando el token generado
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	targetURL := fmt.Sprintf("%s/auth/callback?token=%s", frontendURL, appToken)
	http.Redirect(w, r, targetURL, http.StatusSeeOther)
}
