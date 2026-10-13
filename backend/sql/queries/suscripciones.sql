-- sql/queries/suscripciones.sql

-- ============================================================================
-- 1. GESTIÓN DE SESIONES DE USUARIO (user_sessions)
-- ============================================================================

-- name: RegistrarSesion :one
INSERT INTO user_sessions (user_id, token_id, device_info, ip_address)
VALUES ($1, $2, $3, $4)
RETURNING id;

-- name: ContarSesionesActivas :one
SELECT COUNT(*) FROM user_sessions WHERE user_id = $1;

-- name: EliminarSesionMasAntigua :exec
DELETE FROM user_sessions
WHERE id = (
    SELECT us.id
    FROM user_sessions us
    WHERE us.user_id = $1
    ORDER BY us.last_active_at ASC
    LIMIT 1
);

-- name: ValidarSesionToken :one
SELECT EXISTS(
    SELECT 1 FROM user_sessions
    WHERE user_id = $1 AND token_id = $2
);

-- name: ActualizarActividadSesion :exec
UPDATE user_sessions
SET last_active_at = NOW()
WHERE token_id = $1;

-- name: CerrarSesion :exec
DELETE FROM user_sessions WHERE token_id = $1;


-- ============================================================================
-- 2. NOTIFICACIONES Y ALERTAS PARA ADMINISTRACIÓN (/admin)
-- ============================================================================

-- name: ListarNuevosUsuarios :many
-- Inteligente: Trae a TODOS los registrados recientemente (ej. últimas 48h o 7 días).
-- Así ves a los recién llegados aunque YA les hayas activado el plan (como Dionisio).
SELECT id, correo, nombre_completo, rol, telefono, suscripcion_hasta, creado_en
FROM usuarios
WHERE creado_en >= NOW() - (sqlc.arg(dias)::text || ' days')::interval
ORDER BY creado_en DESC;

-- name: ListarUsuariosPorVencer :many
SELECT id, correo, nombre_completo, rol, telefono, suscripcion_hasta, creado_en
FROM usuarios
WHERE suscripcion_hasta > NOW()
  AND suscripcion_hasta <= NOW() + (sqlc.arg(dias)::text || ' days')::interval
ORDER BY suscripcion_hasta ASC;

-- name: ListarUsuariosExpirados :many
SELECT id, correo, nombre_completo, rol, telefono, suscripcion_hasta, creado_en
FROM usuarios
WHERE suscripcion_hasta IS NOT NULL
  AND suscripcion_hasta <= NOW()
ORDER BY suscripcion_hasta DESC;

-- name: ObtenerResumenAdmin :one
SELECT
    COUNT(*) AS total_usuarios,
    COUNT(CASE WHEN suscripcion_hasta > NOW() THEN 1 END) AS suscripciones_activas,
    COUNT(CASE WHEN suscripcion_hasta > NOW() AND suscripcion_hasta <= NOW() + INTERVAL '7 days' THEN 1 END) AS por_vencer_7_dias,
    COUNT(CASE WHEN creado_en >= NOW() - INTERVAL '7 days' THEN 1 END) AS nuevos_esta_semana
FROM usuarios;

-- name: ActivarSuscripcion :one
INSERT INTO suscripciones (
    usuario_id, plan, monto, metodo_pago, numero_operacion, fecha_expiracion, estado
) VALUES (
    $1, $2, $3, $4, $5, $6, 'activa'
) RETURNING *;