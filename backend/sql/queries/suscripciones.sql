-- name: CheckActiveSubscription :one
SELECT count(*) > 0 AS has_active_subscription
FROM suscripciones 
WHERE usuario_id = $1 
  AND estado = 'activa' 
  AND fecha_expiracion > NOW();

-- name: ActivarSuscripcion :one
INSERT INTO suscripciones (
    usuario_id, plan, monto, metodo_pago, numero_operacion, fecha_expiracion
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING id, estado, fecha_inicio, fecha_expiracion;

-- name: GetSuscripcionActiva :one
SELECT id, plan, estado, fecha_inicio, fecha_expiracion
FROM suscripciones
WHERE usuario_id = $1 
  AND estado = 'activa' 
  AND fecha_expiracion > NOW()
ORDER BY fecha_expiracion DESC
LIMIT 1;