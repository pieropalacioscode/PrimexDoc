package handler

import (
	"crypto/rand"
	"encoding/json"
	"strings"

	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"net/http"
	"os"
	"time"
)

const (
	oauthBrowserCookie = "docentesmart_oauth_browser"
	oauthCodeTTL       = 60 * time.Second
)

func oauthRandomCode() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func oauthHash(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func oauthSetBrowserCookie(w http.ResponseWriter, value string) {
	cookie := &http.Cookie{
		Name:     oauthBrowserCookie,
		Value:    value,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	}

	if os.Getenv("ENV") == "production" {
		cookie.Domain = "docentesmart.com"
	}

	http.SetCookie(w, cookie)
}

func oauthReadBrowserCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie(oauthBrowserCookie)
	if err != nil || cookie.Value == "" {
		return "", errors.New("cookie de navegador OAuth ausente")
	}
	return cookie.Value, nil
}

func oauthClearBrowserCookie(w http.ResponseWriter) {
	cookie := &http.Cookie{
		Name:     oauthBrowserCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   os.Getenv("ENV") == "production",
		SameSite: http.SameSiteLaxMode,
	}

	if os.Getenv("ENV") == "production" {
		cookie.Domain = "docentesmart.com"
	}

	http.SetCookie(w, cookie)
}

// GoogleExchange canjea un codigo temporal por una sesion activa.
// El codigo solo puede consumirse una vez.
func (h *GoogleAuthHandler) GoogleExchange(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")

	var req struct {
		Code string `json:"code"`
	}

	r.Body = http.MaxBytesReader(w, r.Body, 2048)
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Solicitud invalida")
		return
	}

	if len(req.Code) != 43 || strings.ContainsAny(req.Code, " /\\\\") {
		respondWithError(w, http.StatusBadRequest, "Codigo OAuth invalido")
		return
	}

	browser, err := oauthReadBrowserCookie(r)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Sesion OAuth no reconocida")
		return
	}

	result, err := h.DB.ConsumirCodigoOAuth(
		r.Context(),
		db.ConsumirCodigoOAuthParams{
			CodeHash:    oauthHash(req.Code),
			BrowserHash: oauthHash(browser),
		},
	)
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Codigo OAuth invalido o vencido")
		return
	}

	token, err := h.DB.ObtenerTokenSesionOAuth(
		r.Context(),
		db.ObtenerTokenSesionOAuthParams{
			ID:     result.SessionID,
			UserID: result.UserID,
		},
	)
	if err != nil || token == "" {
		respondWithError(w, http.StatusUnauthorized, "Sesion OAuth no disponible")
		return
	}

	oauthClearBrowserCookie(w)
	respondWithJSON(w, http.StatusOK, map[string]string{
		"token": token,
	})
}
