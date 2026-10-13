-- name: CrearCodigoOAuth :exec
INSERT INTO oauth_exchange_codes (
    code_hash,
    browser_hash,
    user_id,
    session_id,
    expires_at
)
VALUES ($1, $2, $3, $4, $5);

-- name: ConsumirCodigoOAuth :one
DELETE FROM oauth_exchange_codes
WHERE code_hash = $1
  AND browser_hash = $2
  AND expires_at > NOW()
RETURNING user_id, session_id;

-- name: ObtenerTokenSesionOAuth :one
SELECT token_id
FROM user_sessions
WHERE id = $1
  AND user_id = $2;
