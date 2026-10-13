-- name: RegistrarTicket :one
INSERT INTO soporte_tickets (
    numero_ticket, usuario_id, nombre_completo, dni_ce,
    correo, tipo, asunto, detalle, metadata
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: ListarTicketsAdmin :many
SELECT * FROM soporte_tickets
ORDER BY leido_por_admin ASC, creado_en DESC;

-- name: ContarTicketsNoLeidos :one
SELECT COUNT(*) FROM soporte_tickets
WHERE leido_por_admin = FALSE;

-- name: MarcarComoLeido :exec
UPDATE soporte_tickets
SET leido_por_admin = TRUE, actualizado_en = NOW()
WHERE id = $1;