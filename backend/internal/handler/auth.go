// backend > internal > handler > auth.go
package handler

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/alienwarecode/docent-primex-api/internal/auth"
	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/crypto/bcrypt"
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

const authCookieName = "primex_token"

// setAuthCookie escribe el JWT como cookie legible por JS/middleware.ts
// (no HttpOnly) para soportar el flujo "Token Híbrido" del frontend.
func setAuthCookie(w http.ResponseWriter, token string) {
	isProd := os.Getenv("ENV") == "production"

	http.SetCookie(w, &http.Cookie{
		Name:     authCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int((7 * 24 * time.Hour).Seconds()), // 7 días
		HttpOnly: false,
		Secure:   isProd,
		SameSite: http.SameSiteLaxMode,
	})
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
		respondWithError(w, http.StatusInternalServerError, "Configuración de autenticación no disponible")
		return
	}

	tokenStr, err := auth.GenerarToken(userIDStr, nuevoUsuario.Correo, "usuario", nuevoUsuario.NombreCompleto, jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al generar sesión")
		return
	}

	// Registrar la primera sesión antes de entregar el JWT.
	userAgent := r.UserAgent()
	ip := r.RemoteAddr

	_, err = h.DB.RegistrarSesion(r.Context(), db.RegistrarSesionParams{
		UserID:     nuevoUsuario.ID,
		TokenID:    tokenStr,
		DeviceInfo: pgtype.Text{String: userAgent, Valid: userAgent != ""},
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "No se pudo iniciar la sesión")
		return
	}

	setAuthCookie(w, tokenStr)

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

// 🛡️ MIDDLEWARE: SessionGuard
// Verifica si la sesión actual no ha sido "pateada" por un nuevo login
func (h *AuthHandler) SessionGuard(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 1. Extraer el token del Header (igual que el JWTMiddleware)
		authHeader := r.Header.Get("Authorization")
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		if tokenStr == "" {
			// Si no hay token en el header, intentamos la cookie (fallback)
			if cookie, err := r.Cookie("primex_token"); err == nil {
				tokenStr = cookie.Value
			}
		}

		userIDStr, ok := auth.GetUserID(r.Context())
		if !ok || tokenStr == "" {
			respondWithError(w, http.StatusUnauthorized, "SESION_INVALIDA")
			return
		}

		parsedID, _ := uuid.Parse(userIDStr)
		userUUID := pgtype.UUID{Bytes: parsedID, Valid: true}

		// 2. Validar en DB
		exists, err := h.DB.ValidarSesionToken(r.Context(), db.ValidarSesionTokenParams{
			UserID:  userUUID,
			TokenID: tokenStr,
		})

		if err != nil || !exists {
			respondWithError(w, http.StatusUnauthorized, "LIMITE_SESIONES_ALCANZADO")
			return
		}

		next.ServeHTTP(w, r)
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
		respondWithError(w, http.StatusInternalServerError, "Configuración de autenticación no disponible")
		return
	}

	tokenStr, err := auth.GenerarToken(userIDStr, usuario.Correo, rolStr, usuario.NombreCompleto, jwtSecret)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Error al generar sesión")
		return
	}

	// --- NUEVA LÓGICA DE CONTROL DE SESIONES (máx. 2 dispositivos activos) ---
	count, errCount := h.DB.ContarSesionesActivas(r.Context(), usuario.ID)
	if errCount != nil {
		respondWithError(w, http.StatusInternalServerError, "No se pudo verificar el límite de sesiones")
		return
	}

	if count >= 2 {
		if errDel := h.DB.EliminarSesionMasAntigua(r.Context(), usuario.ID); errDel != nil {
			respondWithError(w, http.StatusInternalServerError, "No se pudo administrar las sesiones")
			return
		}
	}

	userAgent := r.UserAgent()
	ip := r.RemoteAddr

	if _, errSes := h.DB.RegistrarSesion(r.Context(), db.RegistrarSesionParams{
		UserID:     usuario.ID,
		TokenID:    tokenStr,
		DeviceInfo: pgtype.Text{String: userAgent, Valid: userAgent != ""},
		IpAddress:  pgtype.Text{String: ip, Valid: ip != ""},
	}); errSes != nil {
		respondWithError(w, http.StatusInternalServerError, "No se pudo iniciar la sesión")
		return
	}
	// ------------------------------------------------------------------------

	setAuthCookie(w, tokenStr)

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
	var req struct {
		Correo string `json:"correo"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, 400, "Correo inválido")
		return
	}
	correo := strings.ToLower(strings.TrimSpace(req.Correo))

	// 1. SIEMPRE invalidar códigos anteriores para este correo
	_ = h.DB.InvalidarCodigosPrevios(r.Context(), correo)

	// 2. Verificar si el usuario existe
	user, err := h.DB.ObtenerUsuarioPorCorreo(r.Context(), correo)

	// SI NO EXISTE: Respondemos éxito igual (Anti-enumeración)
	if err != nil {
		respondWithJSON(w, 200, map[string]string{"mensaje": "Si el correo está registrado, recibirás un código."})
		return
	}

	// 3. Generar código
	codigo := fmt.Sprintf("%06d", rand.Intn(1000000))

	// 4. Guardar en DB
	_, err = h.DB.GuardarCodigoRecuperacion(r.Context(), db.GuardarCodigoRecuperacionParams{
		Correo:   correo,
		Codigo:   codigo,
		ExpiraEn: pgtype.Timestamptz{Time: time.Now().Add(15 * time.Minute), Valid: true},
	})

	if err == nil {
		// 5. Enviar Email en segundo plano con LOGS SEGUROS
		go func() {
			fmt.Printf("LOG: Enviando código a usuario ID: %s\n", user.ID) // No logueamos el código ni el email completo
			_ = auth.EnviarCodigoEmail(correo, codigo)
		}()
	}

	respondWithJSON(w, 200, map[string]string{"mensaje": "Si el correo está registrado, recibirás un código."})
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

func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		respondWithError(w, http.StatusUnauthorized, "No autenticado")
		return
	}

	parsedID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}
	userUUID := pgtype.UUID{Bytes: parsedID, Valid: true}

	usuario, err := h.DB.GetUsuarioByID(ctx, userUUID)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	rolStr := "usuario"
	if usuario.Rol.Valid {
		rolStr = usuario.Rol.String
	}

	// --- CORRECCIÓN AQUÍ: Extraer el teléfono de la DB ---
	telStr := ""
	if usuario.Telefono.Valid {
		telStr = usuario.Telefono.String
	}

	var fechaVencimiento interface{}
	fechaVencimiento = nil
	if usuario.SuscripcionHasta.Valid && !usuario.SuscripcionHasta.Time.IsZero() {
		fechaVencimiento = usuario.SuscripcionHasta.Time
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":                userIDStr,
		"nombre_completo":   usuario.NombreCompleto,
		"correo":            usuario.Correo,
		"rol":               rolStr,
		"telefono":          telStr, // <-- Ahora usamos la variable telStr procesada
		"suscripcion_hasta": fechaVencimiento,
	})
}

func (h *AuthHandler) ActualizarMiTelefono(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userIDStr, ok := auth.GetUserID(ctx)
	if !ok || userIDStr == "" {
		respondWithError(w, http.StatusUnauthorized, "No autenticado")
		return
	}

	parsedID, err := uuid.Parse(userIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "ID de usuario inválido")
		return
	}

	var req struct {
		Telefono string `json:"telefono"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	// Guardar en la DB
	err = h.DB.ActualizarTelefono(ctx, db.ActualizarTelefonoParams{
		ID:       pgtype.UUID{Bytes: parsedID, Valid: true},
		Telefono: pgtype.Text{String: req.Telefono, Valid: req.Telefono != ""},
	})

	if err != nil {
		fmt.Printf("Error al actualizar teléfono: %v\n", err)
		respondWithError(w, http.StatusInternalServerError, "No se pudo actualizar el contacto")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"status":  "success",
		"mensaje": "Contacto de WhatsApp actualizado correctamente",
	})
}
