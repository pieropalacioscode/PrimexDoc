-- name: CrearUsuario :one
INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, rol, suscripcion_hasta)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, correo, nombre_completo, rol, suscripcion_hasta, creado_en;

-- name: ObtenerUsuarioPorCorreo :one
SELECT * FROM usuarios WHERE correo = $1 LIMIT 1;