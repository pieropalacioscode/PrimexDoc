package handler

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
)

// --- ESTRUCTURAS DE DATOS (DTOs) ---

type RegisterRequest struct {
	Correo         string `json:"correo"`
	Contrasena     string `json:"contrasena"`
	NombreCompleto string `json:"nombre_completo"`
}

type LoginRequest struct {
	Correo     string `json:"correo"`
	Contrasena string `json:"contrasena"`
}

type ForgotPasswordRequest struct {
	Correo string `json:"correo"`
}

type ResetPasswordRequest struct {
	Correo          string `json:"correo"`
	Codigo          string `json:"codigo"`
	NuevaContrasena string `json:"nueva_contrasena"`
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

// --- HANDLER CONFIG ---

type AuthHandler struct {
	DB *db.Queries
}

func NewAuthHandler(queries *db.Queries) *AuthHandler {
	return &AuthHandler{DB: queries}
}

// --- HELPERS ---

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(payload)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, ErrorResponse{Error: message})
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// --- MÉTODOS DEL HANDLER ---

// Register: Registro de nuevos docentes
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "El cuerpo de la petición no es un JSON válido")
		return
	}

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

	// Verificar disponibilidad de correo
	_, err := h.DB.ObtenerUsuarioPorCorreo(r.Context(), req.Correo)
	if err == nil {
		respondWithError(w, http.StatusConflict, "El correo electrónico ya está registrado")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Contrasena), 12)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al procesar la seguridad")
		return
	}

	var rolText pgtype.Text
	_ = rolText.Scan("usuario")

	nuevoUsuario, err := h.DB.CrearUsuario(r.Context(), db.CrearUsuarioParams{
		Correo:         req.Correo,
		ContrasenaHash: string(hashedPassword),
		NombreCompleto: req.NombreCompleto,
		Rol:            rolText,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al guardar el usuario")
		return
	}

	userIDStr := uuidToString(nuevoUsuario.ID)
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "secret_fallback_dev"
	}

	tokenStr, err := auth.GenerarToken(userIDStr, nuevoUsuario.Correo, "usuario", nuevoUsuario.NombreCompleto, jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al generar sesión")
		return
	}

	respondWithJSON(w, http.StatusCreated, AuthResponse{
		Token: tokenStr,
		Usuario: UserDataDTO{
			ID:             userIDStr,
			Correo:         nuevoUsuario.Correo,
			NombreCompleto: nuevoUsuario.NombreCompleto,
			Rol:            "usuario",
		},
	})
}

// Login: Inicio de sesión tradicional
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	usuario, err := h.DB.ObtenerUsuarioPorCorreo(r.Context(), strings.ToLower(req.Correo))
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "Credenciales incorrectas")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.ContrasenaHash), []byte(req.Contrasena)); err != nil {
		respondWithError(w, http.StatusUnauthorized, "Credenciales incorrectas")
		return
	}

	userIDStr := uuidToString(usuario.ID)
	rolStr := "usuario"
	if usuario.Rol.Valid {
		rolStr = usuario.Rol.String
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "secret_fallback_dev"
	}

	tokenStr, err := auth.GenerarToken(userIDStr, usuario.Correo, rolStr, usuario.NombreCompleto, jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al generar sesión")
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

// ForgotPassword: Genera el código de 6 dígitos y lo envía por email
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Correo inválido")
		return
	}

	// 1. Verificar si el usuario existe
	_, err := h.DB.ObtenerUsuarioPorCorreo(r.Context(), req.Correo)
	if err != nil {
		// Por seguridad, respondemos OK para no revelar qué correos existen
		respondWithJSON(w, http.StatusOK, map[string]string{"mensaje": "Si el correo existe, recibirás un código"})
		return
	}

	// 2. Generar código aleatorio de 6 dígitos
	codigo := fmt.Sprintf("%06d", rand.New(rand.NewSource(time.Now().UnixNano())).Intn(1000000))

	// 3. Guardar en base de datos con expiración de 15 minutos
	expiracion := time.Now().Add(15 * time.Minute)
	_, err = h.DB.GuardarCodigoRecuperacion(r.Context(), db.GuardarCodigoRecuperacionParams{
		Correo:   req.Correo,
		Codigo:   codigo,
		ExpiraEn: pgtype.Timestamptz{Time: expiracion, Valid: true},
	})

	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al generar código de seguridad")
		return
	}

	// 4. Enviar Email Real (usando el servicio en internal/auth)
	// No bloqueamos la respuesta si el email falla, pero lo logueamos
	go func() {
		errMail := auth.EnviarCodigoEmail(req.Correo, codigo)
		if errMail != nil {
			fmt.Printf("❌ Error enviando email a %s: %v\n", req.Correo, errMail)
		} else {
			fmt.Printf("✅ Email enviado exitosamente a %s\n", req.Correo)
		}
	}()

	// 5. Log de respaldo en consola
	fmt.Printf("\n--- 📧 CÓDIGO GENERADO: %s (Usuario: %s) ---\n", codigo, req.Correo)

	respondWithJSON(w, http.StatusOK, map[string]string{
		"mensaje": "Código de seguridad enviado a tu correo",
	})
}

// ResetPassword: Valida el código y actualiza la contraseña
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Datos de entrada inválidos")
		return
	}

	// 1. Validar el código en la base de datos (usado=false y expira_en > now)
	resetData, err := h.DB.ValidarCodigoRecuperacion(r.Context(), db.ValidarCodigoRecuperacionParams{
		Correo: req.Correo,
		Codigo: req.Codigo,
	})
	if err != nil {
		respondWithError(w, http.StatusUnauthorized, "El código es incorrecto, ya fue usado o ha expirado")
		return
	}

	// 2. Hashear la nueva contraseña
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NuevaContrasena), 12)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al procesar la nueva clave")
		return
	}

	// 3. Actualizar la contraseña del usuario
	err = h.DB.ActualizarContrasena(r.Context(), db.ActualizarContrasenaParams{
		Correo:         req.Correo,
		ContrasenaHash: string(hashedPassword),
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "No se pudo actualizar la contraseña")
		return
	}

	// 4. Marcar código como usado para invalidarlo
	_ = h.DB.MarcarCodigoComoUsado(r.Context(), resetData.ID)

	respondWithJSON(w, http.StatusOK, map[string]string{
		"mensaje": "Contraseña actualizada exitosamente",
	})
}
