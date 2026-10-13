package handler

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
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

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		http.Error(w, "No se pudo iniciar autenticación", http.StatusInternalServerError)
		return
	}

	state := base64.RawURLEncoding.EncodeToString(raw)

	http.SetCookie(w, &http.Cookie{
		Name:     "docentesmart_oauth_state",
		Value:    state,
		Path:     "/api/v1/auth/google",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	})

	url := conf.AuthCodeURL(state, oauth2.AccessTypeOffline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

type GoogleUser struct {
	Email         string `json:"email"`
	Name          string `json:"name"`
	VerifiedEmail bool   `json:"verified_email"`
}

// GoogleCallback procesa la respuesta de Google, guarda/obtiene el usuario,
// aplica el control de sesiones simultáneas (máx. 2), setea la cookie
// de sesión y redirige al frontend
func (h *GoogleAuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	stateCookie, cookieErr := r.Cookie("docentesmart_oauth_state")
	receivedState := r.URL.Query().Get("state")

	if cookieErr != nil ||
		receivedState == "" ||
		len(receivedState) != len(stateCookie.Value) ||
		subtle.ConstantTimeCompare(
			[]byte(receivedState),
			[]byte(stateCookie.Value),
		) != 1 {
		http.Error(w, "Estado OAuth inválido", http.StatusUnauthorized)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "docentesmart_oauth_state",
		Value:    "",
		Path:     "/api/v1/auth/google",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	})

	ctx := r.Context()
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

	if resp.StatusCode != http.StatusOK {
		http.Error(w, "Google no pudo verificar la identidad", http.StatusBadGateway)
		return
	}

	var gUser GoogleUser
	if err := json.NewDecoder(resp.Body).Decode(&gUser); err != nil {
		http.Error(w, `{"error": "Fallo al procesar datos del usuario"}`, http.StatusInternalServerError)
		return
	}

	if !gUser.VerifiedEmail || gUser.Email == "" {
		http.Error(w, "Correo de Google no verificado", http.StatusUnauthorized)
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
		respondWithError(w, http.StatusInternalServerError, "Configuración de autenticación no disponible")
		return
	}

	rolStr := dbUser.Rol.String
	if rolStr == "" {
		rolStr = "usuario"
	}

	userIDStr := uuidToString(dbUser.ID)

	appToken, err := auth.GenerarToken(userIDStr, dbUser.Correo, rolStr, dbUser.NombreCompleto, jwtSecret)
	if err != nil {
		http.Error(w, `{"error": "Error al emitir sesión"}`, http.StatusInternalServerError)
		return
	}

	// 🛡️ CONTROL DE SESIONES SIMULTÁNEAS (Límite 2) — misma regla que en Login manual
	count, errCount := h.DB.ContarSesionesActivas(ctx, dbUser.ID)
	if errCount != nil {
		http.Error(w, "No se pudo verificar el límite de sesiones", http.StatusInternalServerError)
		return
	}

	if count >= 2 {
		// "Pateamos" al dispositivo más antiguo para dejar entrar este acceso de Google
		if errDel := h.DB.EliminarSesionMasAntigua(ctx, dbUser.ID); errDel != nil {
			http.Error(w, "No se pudo administrar las sesiones", http.StatusInternalServerError)
			return
		}
	}

	// Registramos esta sesión de Google en la DB
	userAgent := "Google Login: " + r.UserAgent()
	ip := r.RemoteAddr

	sessionID, errSes := h.DB.RegistrarSesion(ctx, db.RegistrarSesionParams{
		UserID:     dbUser.ID,
		TokenID:    appToken,
		DeviceInfo: pgtype.Text{String: userAgent, Valid: true},
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
	})
	if errSes != nil {
		http.Error(w, `{"error":"No se pudo iniciar la sesión"}`, http.StatusInternalServerError)
		return
	}
	// ------------------------------------------------------------------------

	// Crear código de intercambio vinculado al navegador.
	exchangeCode, err := oauthRandomCode()
	if err != nil {
		http.Error(w, "No se pudo preparar la sesión OAuth", http.StatusInternalServerError)
		return
	}

	browserCode, err := oauthRandomCode()
	if err != nil {
		http.Error(w, "No se pudo preparar la sesión OAuth", http.StatusInternalServerError)
		return
	}

	err = h.DB.CrearCodigoOAuth(ctx, db.CrearCodigoOAuthParams{
		CodeHash:    oauthHash(exchangeCode),
		BrowserHash: oauthHash(browserCode),
		UserID:      dbUser.ID,
		SessionID:   sessionID,
		ExpiresAt: pgtype.Timestamptz{
			Time:  time.Now().Add(oauthCodeTTL),
			Valid: true,
		},
	})
	if err != nil {
		http.Error(w, "No se pudo preparar la sesión OAuth", http.StatusInternalServerError)
		return
	}

	oauthSetBrowserCookie(w, browserCode)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		http.Error(w, "FRONTEND_URL no configurada", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	targetURL := fmt.Sprintf("%s/auth/callback?code=%s", frontendURL, exchangeCode)
	http.Redirect(w, r, targetURL, http.StatusSeeOther)
}
