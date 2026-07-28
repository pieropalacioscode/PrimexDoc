-- name: CrearUsuario :one
INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, rol, suscripcion_hasta)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, correo, nombre_completo, rol, suscripcion_hasta, creado_en;

-- name: ObtenerUsuarioPorCorreo :one
SELECT * FROM usuarios WHERE correo = $1 LIMIT 1;

-- name: GetOrCreateUserByEmail :one
INSERT INTO usuarios (correo, contrasena_hash, nombre_completo, rol)
VALUES ($1, 'OAUTH_GOOGLE_PLACEHOLDER', $2, 'usuario')
ON CONFLICT (correo) DO UPDATE 
-- Si ya existe, opcionalmente actualizamos su nombre si estaba vacío, o simplemente lo dejamos intacto
SET nombre_completo = CASE 
    WHEN usuarios.nombre_completo = '' OR usuarios.nombre_completo IS NULL 
    THEN EXCLUDED.nombre_completo 
    ELSE usuarios.nombre_completo 
END
RETURNING id, correo, rol, nombre_completo;