package handler

import (
	"encoding/base64"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestOAuthRandomCode(t *testing.T) {
	a, err := oauthRandomCode()
	if err != nil {
		t.Fatal(err)
	}

	b, err := oauthRandomCode()
	if err != nil {
		t.Fatal(err)
	}

	if a == b {
		t.Fatal("dos códigos OAuth no deben ser iguales")
	}

	for _, code := range []string{a, b} {
		raw, err := base64.RawURLEncoding.DecodeString(code)
		if err != nil {
			t.Fatalf("código inválido: %v", err)
		}

		if len(raw) != 32 {
			t.Fatalf("longitud inesperada: %d", len(raw))
		}
	}
}

func TestOAuthHash(t *testing.T) {
	a := oauthHash("codigo-de-prueba")
	b := oauthHash("codigo-de-prueba")
	c := oauthHash("otro-codigo")

	if a != b {
		t.Fatal("el hash debe ser determinista")
	}

	if a == c {
		t.Fatal("códigos distintos no deben generar el mismo hash")
	}

	if len(a) != 64 {
		t.Fatalf("hash SHA256 con longitud inesperada: %d", len(a))
	}
}

func TestOAuthBrowserCookie(t *testing.T) {
	t.Setenv("ENV", "production")

	w := httptest.NewRecorder()
	oauthSetBrowserCookie(w, "valor-de-prueba")

	result := w.Result()
	defer result.Body.Close()

	cookies := result.Cookies()
	if len(cookies) != 1 {
		t.Fatalf("se esperaba una cookie, se obtuvieron %d", len(cookies))
	}

	cookie := cookies[0]

	if !cookie.HttpOnly || !cookie.Secure {
		t.Fatal("la cookie debe ser HttpOnly y Secure")
	}

	if cookie.Domain != "docentesmart.com" {
		t.Fatal("dominio de cookie incorrecto")
	}

	if !strings.Contains(
		result.Header.Get("Set-Cookie"),
		"SameSite=Lax",
	) {
		t.Fatal("SameSite=Lax no configurado")
	}
}
