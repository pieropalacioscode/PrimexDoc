package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"github.com/alienwarecode/docent-primex-api/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type SoporteHandler struct {
	Queries *db.Queries
}

// Prefijos de numero_ticket por tipo (ej. REC-2026-1234)
var prefijoPorTipo = map[db.TipoSoporte]string{
	db.TipoSoporteRECLAMO:        "REC",
	db.TipoSoporteQUEJA:          "QUE",
	db.TipoSoporteSUGERENCIA:     "SUG",
	db.TipoSoporteERRORCONTENIDO: "ERR",
}

// Tipos que exigen DNI/CE obligatorio (según el comentario del schema SQL)
var tiposConDocumentoObligatorio = map[db.TipoSoporte]bool{
	db.TipoSoporteRECLAMO: true,
	db.TipoSoporteQUEJA:   true,
}

// POST /api/v1/soporte/ticket
func (h *SoporteHandler) CrearTicket(w http.ResponseWriter, r *http.Request) {
	// 1. LÍMITE DE MEMORIA: no permitir cuerpos de petición mayores a 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1024*1024)

	var req struct {
		Nombre     string  `json:"nombre"`
		DniCe      string  `json:"dni_ce"`
		Correo     string  `json:"correo"`
		Tipo       string  `json:"tipo"`
		Asunto     string  `json:"asunto"`
		Detalle    string  `json:"detalle"`
		ExamenID   *string `json:"examen_id,omitempty"`
		PreguntaID *string `json:"pregunta_id,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			respondError(w, http.StatusRequestEntityTooLarge, "El cuerpo de la petición excede el límite permitido (1MB)")
			return
		}
		respondError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	// 2. NORMALIZACIÓN
	req.Nombre = strings.TrimSpace(req.Nombre)
	req.DniCe = strings.TrimSpace(req.DniCe)
	req.Correo = strings.TrimSpace(strings.ToLower(req.Correo))
	req.Tipo = strings.TrimSpace(strings.ToUpper(req.Tipo))
	req.Asunto = strings.TrimSpace(req.Asunto)
	req.Detalle = strings.TrimSpace(req.Detalle)

	// 3. VALIDACIÓN
	if len(req.Nombre) < 3 || len(req.Nombre) > 100 {
		respondError(w, http.StatusBadRequest, "Nombre inválido (3-100 caracteres)")
		return
	}
	if !isCorreoValido(req.Correo) {
		respondError(w, http.StatusBadRequest, "Correo electrónico inválido")
		return
	}
	tipo, ok := parseTipoSoporte(req.Tipo)
	if !ok {
		respondError(w, http.StatusBadRequest, "Tipo inválido (use: RECLAMO, QUEJA, SUGERENCIA, ERROR_CONTENIDO)")
		return
	}
	if tiposConDocumentoObligatorio[tipo] {
		if !isDocumentoValido(req.DniCe) {
			respondError(w, http.StatusBadRequest, "DNI/CE obligatorio y debe ser válido para RECLAMO o QUEJA")
			return
		}
	} else if req.DniCe != "" && !isDocumentoValido(req.DniCe) {
		respondError(w, http.StatusBadRequest, "DNI/CE inválido")
		return
	}
	if len(req.Asunto) < 3 || len(req.Asunto) > 150 {
		respondError(w, http.StatusBadRequest, "El asunto debe tener entre 3 y 150 caracteres")
		return
	}
	if len(req.Detalle) < 10 || len(req.Detalle) > 3000 {
		respondError(w, http.StatusBadRequest, "El detalle debe tener entre 10 y 3000 caracteres")
		return
	}

	// 4. NÚMERO DE TICKET (ej. REC-2026-4821)
	numeroTicket := generarNumeroTicket(tipo)

	// 5. METADATA OPCIONAL (examen_id / pregunta_id, si vienen)
	var metadata []byte
	if req.ExamenID != nil || req.PreguntaID != nil {
		m := map[string]any{}
		if req.ExamenID != nil {
			m["examen_id"] = *req.ExamenID
		}
		if req.PreguntaID != nil {
			m["pregunta_id"] = *req.PreguntaID
		}
		bytes, err := json.Marshal(m)
		if err != nil {
			log.Printf("error serializando metadata de ticket: %v", err)
		} else {
			metadata = bytes
		}
	}

	// 6. dni_ce es NULLABLE en la tabla -> pgtype.Text
	var dniCe pgtype.Text
	if req.DniCe != "" {
		dniCe = pgtype.Text{String: req.DniCe, Valid: true}
	}

	// 7. usuario_id: la ruta es pública (sin authMiddleware), se guarda como NULL.
	// Si en el futuro se autentica al usuario antes de este endpoint, reemplazar
	// aquí con el UUID real extraído del contexto.
	var usuarioID pgtype.UUID

	ticket, err := h.Queries.RegistrarTicket(r.Context(), db.RegistrarTicketParams{
		NumeroTicket:   numeroTicket,
		UsuarioID:      usuarioID,
		NombreCompleto: req.Nombre,
		DniCe:          dniCe,
		Correo:         req.Correo,
		Tipo:           tipo,
		Asunto:         req.Asunto,
		Detalle:        req.Detalle,
		Metadata:       metadata,
	})
	if err != nil {
		log.Printf("error registrando ticket de soporte: %v", err)
		respondError(w, http.StatusInternalServerError, "No se pudo registrar el ticket, intente nuevamente")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"mensaje": "Ticket registrado correctamente",
		"ticket":  ticket,
	})
}

// GET /admin/soporte/stats -> Para la alerta en la campana
func (h *SoporteHandler) GetAlertasCount(w http.ResponseWriter, r *http.Request) {
	count, err := h.Queries.ContarTicketsNoLeidos(r.Context())
	if err != nil {
		log.Printf("error contando tickets no leídos: %v", err)
		respondError(w, http.StatusInternalServerError, "No se pudo obtener el conteo de tickets")
		return
	}
	respondJSON(w, http.StatusOK, map[string]int64{"no_leidos": count})
}

// GET /admin/soporte/tickets
func (h *SoporteHandler) ListarTickets(w http.ResponseWriter, r *http.Request) {
	tickets, err := h.Queries.ListarTicketsAdmin(r.Context())
	if err != nil {
		log.Printf("error listando tickets: %v", err)
		respondError(w, http.StatusInternalServerError, "Error al listar tickets")
		return
	}
	respondJSON(w, http.StatusOK, tickets)
}

// POST /api/v1/admin/soporte/tickets/{id}/leido
func (h *SoporteHandler) MarcarLeido(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	parsedID, err := uuid.Parse(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID de ticket inválido")
		return
	}

	if err := h.Queries.MarcarComoLeido(r.Context(), pgtype.UUID{Bytes: parsedID, Valid: true}); err != nil {
		log.Printf("error marcando ticket %s como leído: %v", idStr, err)
		respondError(w, http.StatusInternalServerError, "No se pudo actualizar el ticket")
		return
	}
	w.WriteHeader(http.StatusOK)
}

// --- Helpers propios de soporte ---
// (respondJSON y respondError viven en handler_utils.go, NO redeclarar aquí)

func parseTipoSoporte(valor string) (db.TipoSoporte, bool) {
	switch db.TipoSoporte(valor) {
	case db.TipoSoporteRECLAMO, db.TipoSoporteQUEJA, db.TipoSoporteSUGERENCIA, db.TipoSoporteERRORCONTENIDO:
		return db.TipoSoporte(valor), true
	default:
		return "", false
	}
}

func isDocumentoValido(doc string) bool {
	if len(doc) < 8 || len(doc) > 15 {
		return false
	}
	for _, c := range doc {
		if !((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
			return false
		}
	}
	return true
}

func isCorreoValido(correo string) bool {
	if len(correo) < 5 || len(correo) > 254 {
		return false
	}
	arroba := strings.Index(correo, "@")
	if arroba <= 0 || arroba == len(correo)-1 {
		return false
	}
	dominio := correo[arroba+1:]
	return strings.Contains(dominio, ".") && !strings.HasPrefix(dominio, ".") && !strings.HasSuffix(dominio, ".")
}

func generarNumeroTicket(tipo db.TipoSoporte) string {
	prefijo := prefijoPorTipo[tipo]
	if prefijo == "" {
		prefijo = "TKT"
	}
	rnd := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%s-%d-%04d", prefijo, time.Now().Year(), rnd.Intn(10000))
}
