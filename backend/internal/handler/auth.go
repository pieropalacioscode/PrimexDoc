package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
)

// Estructuras de Petición / Respuesta (DTOs)
type RegisterRequest struct {
	Correo         string `json:"correo"`
	Contrasena     string `json:"contrasena"`
	NombreCompleto string `json:"nombre_completo"`
}

type LoginRequest struct {
	Correo     string `json:"correo"`
	Contrasena string `json:"contrasena"`
}

type AuthResponse struct {
	Token   string      `json:"token"`
	Usuario UserDataDTO `json:"usuario"`
}

type UserDataDTO struct {
	ID             string `json:"id"`
	Correo         string `json:"correo"`
	NombreCompleto string `json:"nombre_completo"`
	Rol            string `json:"rol"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

// Helpers para respuestas JSON unificadas
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, ErrorResponse{Error: message})
}

// Helper para convertir pgtype.UUID a string canónico (8-4-4-4-12)
func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// Registro de nuevos docentes
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "El cuerpo de la petición no es un JSON válido")
		return
	}

	// Validaciones básicas de entrada
	req.Correo = strings.ToLower(strings.TrimSpace(req.Correo))
	req.NombreCompleto = strings.TrimSpace(req.NombreCompleto)

	if req.Correo == "" || req.NombreCompleto == "" {
		respondWithError(w, http.StatusBadRequest, "El correo y el nombre completo son obligatorios")
		return
	}

	if len(req.Contrasena) < 6 {
		respondWithError(w, http.StatusBadRequest, "La contraseña debe tener al menos 6 caracteres")
		return
	}

	// Verificar si el usuario ya existe
	_, err := h.DB.ObtenerUsuarioPorCorreo(r.Context(), req.Correo)
	if err == nil {
		respondWithError(w, http.StatusConflict, "El correo electrónico ya está registrado")
		return
	} else if !errors.Is(err, pgx.ErrNoRows) {
		respondWithError(w, http.StatusInternalServerError, "Error interno al verificar disponibilidad de usuario")
		return
	}

	// Hash de contraseña con Bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Contrasena), 12)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al procesar la seguridad de la contraseña")
		return
	}

	// Parámetros para sqlc
	var rolText pgtype.Text
	_ = rolText.Scan("usuario")

	nuevoUsuario, err := h.DB.CrearUsuario(r.Context(), db.CrearUsuarioParams{
		Correo:         req.Correo,
		ContrasenaHash: string(hashedPassword),
		NombreCompleto: req.NombreCompleto,
		Rol:            rolText,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al guardar el usuario en la base de datos")
		return
	}

	// Conversiones seguras
	userIDStr := uuidToString(nuevoUsuario.ID)
	rolStr := "usuario"
	if nuevoUsuario.Rol.Valid && nuevoUsuario.Rol.String != "" {
		rolStr = nuevoUsuario.Rol.String
	}

	// Generar Token JWT
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "secret_fallback_dev"
	}

	tokenStr, err := auth.GenerarToken(userIDStr, nuevoUsuario.Correo, rolStr, jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al generar el token de sesión")
		return
	}

	respondWithJSON(w, http.StatusCreated, AuthResponse{
		Token: tokenStr,
		Usuario: UserDataDTO{
			ID:             userIDStr,
			Correo:         nuevoUsuario.Correo,
			NombreCompleto: nuevoUsuario.NombreCompleto,
			Rol:            rolStr,
		},
	})
}

// Login de docentes
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "El cuerpo de la petición no es un JSON válido")
		return
	}

	req.Correo = strings.ToLower(strings.TrimSpace(req.Correo))

	if req.Correo == "" || req.Contrasena == "" {
		respondWithError(w, http.StatusBadRequest, "Debe proporcionar correo y contraseña")
		return
	}

	// Buscar usuario en la BD
	usuario, err := h.DB.ObtenerUsuarioPorCorreo(r.Context(), req.Correo)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			respondWithError(w, http.StatusUnauthorized, "Credenciales incorrectas")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Error de servidor al consultar credenciales")
		return
	}

	// Validar hash de contraseña
	if err := bcrypt.CompareHashAndPassword([]byte(usuario.ContrasenaHash), []byte(req.Contrasena)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Credenciales incorrectas")
		return
	}

	// Conversiones seguras
	userIDStr := uuidToString(usuario.ID)
	rolStr := "usuario"
	if usuario.Rol.Valid && usuario.Rol.String != "" {
		rolStr = usuario.Rol.String
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "secret_fallback_dev"
	}

	tokenStr, err := auth.GenerarToken(userIDStr, usuario.Correo, rolStr, jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al generar el token de sesión")
		return
	}

	respondWithJSON(w, http.StatusOK, AuthResponse{
		Token: tokenStr,
		Usuario: UserDataDTO{
			ID:             userIDStr,
			Correo:         usuario.Correo,
			NombreCompleto: usuario.NombreCompleto,
			Rol:            rolStr,
		},
	})
}