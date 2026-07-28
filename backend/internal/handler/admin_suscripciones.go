package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
)

type ActivarSuscripcionRequest struct {
	UsuarioID       string  `json:"usuario_id"`
	Plan            string  `json:"plan"`
	Monto           float64 `json:"monto"`
	MetodoPago      string  `json:"metodo_pago"`
	NumeroOperacion string  `json:"numero_operacion"`
}

type AdminSuscripcionesHandler struct {
	DB *db.Queries
}

func (h *AdminSuscripcionesHandler) Activar(w http.ResponseWriter, r *http.Request) {
	var req ActivarSuscripcionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Cuerpo de petición inválido"}`, http.StatusBadRequest)
		return
	}

	var userUUID pgtype.UUID
	if err := userUUID.Scan(req.UsuarioID); err != nil {
		http.Error(w, `{"error": "ID de usuario inválido"}`, http.StatusBadRequest)
		return
	}

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
		http.Error(w, `{"error": "Plan inválido. Use mensual, semestral o anual"}`, http.StatusBadRequest)
		return
	}

	montoPg := pgtype.Numeric{}
	montoPg.Scan(req.Monto)

	expiracionPg := pgtype.Timestamptz{Time: fechaExpiracion, Valid: true}
	metodoPagoPg := pgtype.Text{String: req.MetodoPago, Valid: req.MetodoPago != ""}
	numOpPg := pgtype.Text{String: req.NumeroOperacion, Valid: req.NumeroOperacion != ""}

	sub, err := h.DB.ActivarSuscripcion(r.Context(), db.ActivarSuscripcionParams{
		UsuarioID:       userUUID,
		Plan:            db.TipoPlan(req.Plan),
		Monto:           montoPg,
		MetodoPago:      metodoPagoPg,
		NumeroOperacion: numOpPg,
		FechaExpiracion: expiracionPg,
	})

	if err != nil {
		http.Error(w, `{"error": "No se pudo activar la suscripción"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"mensaje":        "Suscripción activada exitosamente",
		"suscripcion_id": sub.ID,
		"estado":         sub.Estado,
		"expira_en":      sub.FechaExpiracion.Time,
	})
}
