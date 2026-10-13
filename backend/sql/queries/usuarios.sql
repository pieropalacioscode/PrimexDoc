-- name: CrearUsuario :one
INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, rol)
VALUES ($1, $2, $3, $4)
RETURNING id, correo, nombre_completo, rol, creado_en;

-- name: ObtenerUsuarioPorCorreo :one
SELECT * FROM usuarios WHERE correo = $1 LIMIT 1;

-- name: GetOrCreateUserByEmail :one
INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, rol)
VALUES ($1, 'OAUTH_GOOGLE_PLACEHOLDER', $2, 'usuario')
ON CONFLICT (correo) DO UPDATE
SET nombre_completo = CASE
    WHEN usuarios.nombre_completo = '' OR usuarios.nombre_completo IS NULL
    THEN EXCLUDED.nombre_completo
    ELSE usuarios.nombre_completo
END
RETURNING id, correo, rol, nombre_completo, suscripcion_hasta;

-- name: GuardarCodigoRecuperacion :one
INSERT INTO password_resets (correo, codigo, expira_en)
VALUES ($1, $2, $3)
RETURNING id;

-- name: ValidarCodigoRecuperacion :one
SELECT * FROM password_resets
WHERE correo = $1 AND codigo = $2 AND usado = FALSE AND expira_en > NOW()
LIMIT 1;

-- name: MarcarCodigoComoUsado :exec
UPDATE password_resets SET usado = TRUE WHERE id = $1;

-- name: ActualizarContrasena :exec
UPDATE usuarios SET contrasena_hash = $2, actualizado_en = NOW() WHERE correo = $1;

-- name: GetUsuarioByID :one
SELECT id, correo, nombre_completo, rol, telefono, suscripcion_hasta
FROM usuarios
WHERE id = $1;

-- name: ListarUsuariosParaAdmin :many
SELECT id, correo, nombre_completo, rol, telefono, suscripcion_hasta, creado_en
FROM usuarios
WHERE $1::text = ''
   OR correo ILIKE '%' || $1 || '%'
   OR nombre_completo ILIKE '%' || $1 || '%'
   OR telefono ILIKE '%' || $1 || '%'
ORDER BY creado_en DESC;

-- name: ActualizarTelefono :exec
UPDATE usuarios
SET telefono = $2, actualizado_en = NOW()
WHERE id = $1;

-- name: ExtenderSuscripcion :exec
-- Si la suscripción está vigente, suma meses al vencimiento actual.
-- Si ya venció, suma meses a partir de hoy.
UPDATE usuarios
SET suscripcion_hasta = CASE
    WHEN suscripcion_hasta > NOW() THEN suscripcion_hasta + ($2 || ' month')::interval
    ELSE NOW() + ($2 || ' month')::interval
END,
actualizado_en = NOW()
WHERE id = $1;

-- name: InvalidarCodigosPrevios :exec
UPDATE password_resets
SET usado = TRUE
WHERE correo = $1 AND usado = FALSE;