package handler

import (
	"context" // Corregido: Import añadido
	"encoding/json"
	"fmt"
	"log" // Corregido: Import añadido
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/alienwarecode/docent-primex-api/internal/db"
)

// Helper interno para convertir pgtype.UUID a string
// func uuidToString(u pgtype.UUID) string {
// 	if !u.Valid {
// 		return ""
// 	}
// 	id, err := uuid.FromBytes(u.Bytes[:])
// 	if err != nil {
// 		return ""
// 	}
// 	return id.String()
// }

type AdminNotificacionesHandler struct {
	DB *db.Queries
}

// --- DTO compartido para las listas de alertas ---

type AlertaUsuarioDTO struct {
	ID               string `json:"id"`
	Correo           string `json:"correo"`
	NombreCompleto   string `json:"nombre_completo"`
	Telefono         string `json:"telefono"`
	SuscripcionHasta string `json:"suscripcion_hasta"`
	DiasRestantes    int    `json:"dias_restantes"`
	Estado           string `json:"estado"` // "nuevo" | "por_vencer" | "vencido"
	CreadoEn         string `json:"creado_en"`
}

func mapAlerta(id pgtype.UUID, correo, nombre string, telefono pgtype.Text, susc pgtype.Timestamptz, creado pgtype.Timestamptz, estado string) AlertaUsuarioDTO {
	dto := AlertaUsuarioDTO{
		ID:             uuidToString(id),
		Correo:         correo,
		NombreCompleto: nombre,
		Estado:         estado,
	}

	if telefono.Valid {
		dto.Telefono = telefono.String
	}

	if susc.Valid {
		dto.SuscripcionHasta = susc.Time.Format("2006-01-02")
		dto.DiasRestantes = int(time.Until(susc.Time).Hours() / 24)
	}

	if creado.Valid {
		dto.CreadoEn = creado.Time.Format("2006-01-02")
	}

	return dto
}

func diasParam(r *http.Request, def int) int {
	q := r.URL.Query().Get("dias")
	if q == "" {
		return def
	}
	v, err := strconv.Atoi(q)
	if err != nil || v <= 0 {
		return def
	}
	return v
}

// ResumenAlertas: contadores para los badges del panel /admin
func (h *AdminNotificacionesHandler) ResumenAlertas(w http.ResponseWriter, r *http.Request) {
	resumen, err := h.DB.ObtenerResumenAdmin(r.Context())
	if err != nil {
		http.Error(w, `{"error":"No se pudo obtener el resumen"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_usuarios":        resumen.TotalUsuarios,
		"suscripciones_activas": resumen.SuscripcionesActivas,
		"por_vencer_7_dias":     resumen.PorVencer7Dias,
		"nuevos_esta_semana":    resumen.NuevosEstaSemana,
	})
}

// ListarNuevos: usuarios registrados recientemente
func (h *AdminNotificacionesHandler) ListarNuevos(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	dias := diasParam(r, 7)
	diasStr := fmt.Sprintf("%d", dias)

	filas, err := h.DB.ListarNuevosUsuarios(ctx, diasStr)
	if err != nil {
		log.Printf("❌ [ListarNuevos] Error BD (días=%d): %v", dias, err)
		http.Error(w, `{"error":"Error interno al obtener los usuarios recientes."}`, http.StatusInternalServerError)
		return
	}

	respuesta := make([]AlertaUsuarioDTO, 0, len(filas))
	for _, u := range filas {
		respuesta = append(respuesta, mapAlerta(
			u.ID,
			u.Correo,
			u.NombreCompleto,
			u.Telefono,
			u.SuscripcionHasta,
			u.CreadoEn,
			"nuevo",
		))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}

// ListarPorVencer: suscripciones que vencen pronto
func (h *AdminNotificacionesHandler) ListarPorVencer(w http.ResponseWriter, r *http.Request) {
	dias := diasParam(r, 7)

	filas, err := h.DB.ListarUsuariosPorVencer(r.Context(), fmt.Sprintf("%d", dias))
	if err != nil {
		http.Error(w, `{"error":"No se pudo listar suscripciones por vencer"}`, http.StatusInternalServerError)
		return
	}

	respuesta := make([]AlertaUsuarioDTO, 0, len(filas))
	for _, u := range filas {
		respuesta = append(respuesta, mapAlerta(
			u.ID,
			u.Correo,
			u.NombreCompleto,
			u.Telefono,
			u.SuscripcionHasta,
			u.CreadoEn,
			"por_vencer",
		))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}

// ListarVencidos: suscripciones ya vencidas
func (h *AdminNotificacionesHandler) ListarVencidos(w http.ResponseWriter, r *http.Request) {
	filas, err := h.DB.ListarUsuariosExpirados(r.Context())
	if err != nil {
		http.Error(w, `{"error":"No se pudo listar suscripciones vencidas"}`, http.StatusInternalServerError)
		return
	}

	respuesta := make([]AlertaUsuarioDTO, 0, len(filas))
	for _, u := range filas {
		respuesta = append(respuesta, mapAlerta(
			u.ID,
			u.Correo,
			u.NombreCompleto,
			u.Telefono,
			u.SuscripcionHasta,
			u.CreadoEn,
			"vencido",
		))
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(respuesta)
}

// ActualizarTelefono: guarda el número o username de WhatsApp de un docente
func (h *AdminNotificacionesHandler) ActualizarTelefono(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	parsedID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, `{"error":"ID inválido"}`, http.StatusBadRequest)
		return
	}

	var req struct {
		Telefono string `json:"telefono"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"JSON inválido"}`, http.StatusBadRequest)
		return
	}

	err = h.DB.ActualizarTelefono(r.Context(), db.ActualizarTelefonoParams{
		ID:       pgtype.UUID{Bytes: parsedID, Valid: true},
		Telefono: pgtype.Text{String: req.Telefono, Valid: req.Telefono != ""},
	})
	if err != nil {
		http.Error(w, `{"error":"No se pudo actualizar el teléfono"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
