package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTCustomClaims struct {
	UserID string `json:"user_id"`
	Correo string `json:"correo"`
	Rol    string `json:"rol"`
	jwt.RegisteredClaims
}

// GenerarToken firma un nuevo JWT con duración de 24 horas
func GenerarToken(userID, correo, rol, secret string) (string, error) {
	claims := JWTCustomClaims{
		UserID: userID,
		Correo: correo,
		Rol:    rol,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "docente-smart-primex",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidarToken comprueba la validez de un token recibido
func ValidarToken(tokenStr, secret string) (*JWTCustomClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &JWTCustomClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("método de firma no válido")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTCustomClaims)
	if !ok || !token.Valid {
		return nil, errors.New("token no válido o expirado")
	}

	return claims, nil
}