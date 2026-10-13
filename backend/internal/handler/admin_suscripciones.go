// backend > internal > handler > admin_suscripciones.go
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/alienwarecode/docent-primex-api/internal/db"
)

// NOTA: uuidToString NO se declara aquí — ya existe en auth.go (mismo paquete "handler").

// --- HELPERS LOCALES ---

// formatFechaNullable formatea un pgtype.Timestamptz opcional. Si no es válido, devuelve textoSiVacio.
func formatFechaNullable(t pgtype.Timestamptz, textoSiVacio string) string {
	if !t.Valid {
		return textoSiVacio
	}
	return t.Time.Format("2006-01-02")
}

// diasDesdeQuery lee ?dias=N de la query string, valida que sea entero positivo,
// y lo devuelve como string (las queries SQL lo castean vía ::text ::interval).
func diasDesdeQuery(r *http.Request, porDefecto string) string {
	dias := r.URL.Query().Get("dias")
	if dias == "" {
		return porDefecto
	}
	if n, err := strconv.Atoi(dias); err != nil || n <= 0 {
		return porDefecto
	}
	return dias
}

// --- STRUCTS ---

type ActivarSuscripcionRequest struct {
	UsuarioID       string  `json:"usuario_id"`
	Plan            string  `json:"plan"`
	Monto           float64 `json:"monto"`
	MetodoPago      string  `json:"metodo_pago"`
	NumeroOperacion string  `json:"numero_operacion"`
}

// UsuarioAdminDTO es la forma común para las listas de monitoreo de usuarios.
type UsuarioAdminDTO struct {
	ID               string `json:"id"`
	Correo           string `json:"correo"`
	NombreCompleto   string `json:"nombre_completo"`
	Rol              string `json:"rol"`
	Telefono         string `json:"telefono"`
	SuscripcionHasta string `json:"suscripcion_hasta"`
	CreadoEn         string `json:"creado_en"`
}

type ResumenAdminDTO struct {
	TotalUsuarios        int64 `json:"total_usuarios"`
	SuscripcionesActivas int64 `json:"suscripciones_activas"`
	PorVencer7Dias       int64 `json:"por_vencer_7_dias"`
	NuevosEstaSemana     int64 `json:"nuevos_esta_semana"`
}

type AdminSuscripcionesHandler struct {
	DB *db.Queries
}

// --- LISTADO PRINCIPAL CON BUSCADOR ---

// ListarUsuarios: Lista docentes para el panel administrativo con buscador
func (h *AdminSuscripcionesHandler) ListarUsuarios(w http.ResponseWriter, r *http.Request) {
	queryStr := r.URL.Query().Get("q")
	usuarios, err := h.DB.ListarUsuariosParaAdmin(r.Context(), queryStr)
	if err != nil {
		http.Error(w, "Error", 500)
		return
	}

	type UserAdminDTO struct {
		ID               string `json:"id"`
		Correo           string `json:"correo"`
		NombreCompleto   string `json:"nombre_completo"`
		Telefono         string `json:"telefono"`
		SuscripcionHasta string `json:"suscripcion_hasta"`
	}

	respuesta := make([]UserAdminDTO, 0)
	for _, u := range usuarios {
		fechaStr := "Sin suscripción"
		if u.SuscripcionHasta.Valid {
			fechaStr = u.SuscripcionHasta.Time.Format("2006-01-02")
		}

		respuesta = append(respuesta, UserAdminDTO{
			ID:               uuidToString(u.ID),
			Correo:           u.Correo,
			NombreCompleto:   u.NombreCompleto,
			Telefono:         u.Telefono.String, // <--- ¡AÑADIR ESTO!
			SuscripcionHasta: fechaStr,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}

// Activar: Registra un pago y activa plan (mensual, semestral, anual)
func (h *AdminSuscripcionesHandler) Activar(w http.ResponseWriter, r *http.Request) {
	var req ActivarSuscripcionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"Cuerpo de petición inválido"}`, http.StatusBadRequest)
		return
	}

	parsedID, err := uuid.Parse(req.UsuarioID)
	if err != nil {
		http.Error(w, `{"error":"ID de usuario inválido"}`, http.StatusBadRequest)
		return
	}
	userUUID := pgtype.UUID{Bytes: parsedID, Valid: true}

	ahora := time.Now()
	var fechaExpiracion time.Time
	switch req.Plan {
	case "mensual":
		fechaExpiracion = ahora.AddDate(0, 1, 0)
	case "semestral":
		fechaExpiracion = ahora.AddDate(0, 6, 0)
	case "anual":
		fechaExpiracion = ahora.AddDate(1, 0, 0)
	default:
		http.Error(w, `{"error":"Plan inválido. Use mensual, semestral o anual"}`, http.StatusBadRequest)
		return
	}

	montoPg := pgtype.Numeric{}
	if err := montoPg.Scan(fmt.Sprintf("%f", req.Monto)); err != nil {
		http.Error(w, `{"error":"Monto inválido"}`, http.StatusBadRequest)
		return
	}

	sub, err := h.DB.ActivarSuscripcion(r.Context(), db.ActivarSuscripcionParams{
		UsuarioID:       userUUID,
		Plan:            db.TipoPlan(req.Plan),
		Monto:           montoPg,
		MetodoPago:      pgtype.Text{String: req.MetodoPago, Valid: req.MetodoPago != ""},
		NumeroOperacion: pgtype.Text{String: req.NumeroOperacion, Valid: req.NumeroOperacion != ""},
		FechaExpiracion: pgtype.Timestamptz{Time: fechaExpiracion, Valid: true},
	})
	if err != nil {
		http.Error(w, `{"error":"No se pudo activar la suscripción"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje":        "Suscripción activada exitosamente",
		"suscripcion_id": uuidToString(sub.ID),
		"estado":         sub.Estado,
		"expira_en":      sub.FechaExpiracion.Time,
	})
}

// ExtenderSuscripcion: Añade meses a la suscripción de un docente específico
func (h *AdminSuscripcionesHandler) ExtenderSuscripcion(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	parsedID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, `{"error":"ID inválido"}`, http.StatusBadRequest)
		return
	}
	userUUID := pgtype.UUID{Bytes: parsedID, Valid: true}

	var req struct {
		Meses int `json:"meses"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"JSON inválido"}`, http.StatusBadRequest)
		return
	}

	mesesArg := pgtype.Text{String: fmt.Sprintf("%d", req.Meses), Valid: true}

	err = h.DB.ExtenderSuscripcion(r.Context(), db.ExtenderSuscripcionParams{
		ID:      userUUID,
		Column2: mesesArg,
	})
	if err != nil {
		http.Error(w, `{"error":"Error al actualizar membresía"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": fmt.Sprintf("Membresía extendida por %d mes(es)", req.Meses),
	})
}

// --- NUEVOS ENDPOINTS DE MONITOREO ---

// ListarNuevosUsuarios: usuarios registrados en los últimos ?dias= días (default 7)
func (h *AdminSuscripcionesHandler) ListarNuevosUsuarios(w http.ResponseWriter, r *http.Request) {
	dias := diasDesdeQuery(r, "7")

	usuarios, err := h.DB.ListarNuevosUsuarios(r.Context(), dias)
	if err != nil {
		http.Error(w, `{"error":"Error al listar nuevos usuarios"}`, http.StatusInternalServerError)
		return
	}

	respuesta := make([]UsuarioAdminDTO, 0, len(usuarios))
	for _, u := range usuarios {
		respuesta = append(respuesta, UsuarioAdminDTO{
			ID:               uuidToString(u.ID),
			Correo:           u.Correo,
			NombreCompleto:   u.NombreCompleto,
			Rol:              u.Rol.String,
			Telefono:         u.Telefono.String,
			SuscripcionHasta: formatFechaNullable(u.SuscripcionHasta, "Sin suscripción"),
			CreadoEn:         formatFechaNullable(u.CreadoEn, ""),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}

// ListarUsuariosPorVencer: usuarios cuya suscripción vence en los próximos ?dias= días (default 7)
func (h *AdminSuscripcionesHandler) ListarUsuariosPorVencer(w http.ResponseWriter, r *http.Request) {
	dias := diasDesdeQuery(r, "7")

	usuarios, err := h.DB.ListarUsuariosPorVencer(r.Context(), dias)
	if err != nil {
		http.Error(w, `{"error":"Error al listar usuarios por vencer"}`, http.StatusInternalServerError)
		return
	}

	respuesta := make([]UsuarioAdminDTO, 0, len(usuarios))
	for _, u := range usuarios {
		respuesta = append(respuesta, UsuarioAdminDTO{
			ID:               uuidToString(u.ID),
			Correo:           u.Correo,
			NombreCompleto:   u.NombreCompleto,
			Rol:              u.Rol.String,
			Telefono:         u.Telefono.String,
			SuscripcionHasta: formatFechaNullable(u.SuscripcionHasta, "Sin suscripción"),
			CreadoEn:         formatFechaNullable(u.CreadoEn, ""),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}

// ListarUsuariosExpirados: usuarios cuya suscripción ya venció
func (h *AdminSuscripcionesHandler) ListarUsuariosExpirados(w http.ResponseWriter, r *http.Request) {
	usuarios, err := h.DB.ListarUsuariosExpirados(r.Context())
	if err != nil {
		http.Error(w, `{"error":"Error al listar usuarios expirados"}`, http.StatusInternalServerError)
		return
	}

	respuesta := make([]UsuarioAdminDTO, 0, len(usuarios))
	for _, u := range usuarios {
		respuesta = append(respuesta, UsuarioAdminDTO{
			ID:               uuidToString(u.ID),
			Correo:           u.Correo,
			NombreCompleto:   u.NombreCompleto,
			Rol:              u.Rol.String,
			Telefono:         u.Telefono.String,
			SuscripcionHasta: formatFechaNullable(u.SuscripcionHasta, "Sin suscripción"),
			CreadoEn:         formatFechaNullable(u.CreadoEn, ""),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}

// ObtenerResumenAdmin: KPIs agregados para el dashboard del panel
func (h *AdminSuscripcionesHandler) ObtenerResumenAdmin(w http.ResponseWriter, r *http.Request) {
	resumen, err := h.DB.ObtenerResumenAdmin(r.Context())
	if err != nil {
		http.Error(w, `{"error":"Error al obtener el resumen"}`, http.StatusInternalServerError)
		return
	}

	respuesta := ResumenAdminDTO{
		TotalUsuarios:        resumen.TotalUsuarios,
		SuscripcionesActivas: resumen.SuscripcionesActivas,
		PorVencer7Dias:       resumen.PorVencer7Dias,
		NuevosEstaSemana:     resumen.NuevosEstaSemana,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}
