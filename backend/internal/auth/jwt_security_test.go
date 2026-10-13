package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestJWTValidacionSegura(t *testing.T) {
	secret := "clave-de-prueba-no-utilizar-en-produccion"

	good, err := GenerarToken(
		"usuario-test",
		"test@example.com",
		"usuario",
		"Usuario Test",
		secret,
	)
	if err != nil {
		t.Fatal(err)
	}

	if _, err := ValidarToken(good, secret); err != nil {
		t.Fatalf("HS256 valido rechazado: %v", err)
	}

	claims := JWTCustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: "docent-smart-primex",
			ExpiresAt: jwt.NewNumericDate(
				time.Now().Add(time.Hour),
			),
		},
	}

	bad := jwt.NewWithClaims(jwt.SigningMethodHS384, claims)
	signed, err := bad.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	if _, err := ValidarToken(signed, secret); err == nil {
		t.Fatal("HS384 fue aceptado")
	}

	claims.Issuer = "emisor-desconocido"
	wrongIssuer := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err = wrongIssuer.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	if _, err := ValidarToken(signed, secret); err == nil {
		t.Fatal("Emisor incorrecto fue aceptado")
	}

	claims.Issuer = "docent-smart-primex"
	claims.ExpiresAt = nil

	noExpiry := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err = noExpiry.SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}

	if _, err := ValidarToken(signed, secret); err == nil {
		t.Fatal("Token sin expiracion fue aceptado")
	}
}
