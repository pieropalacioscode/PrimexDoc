-- name: ListarNoticias :many
SELECT id, titulo, slug, resumen, categoria, banner_filename, publicado_en, vistas
FROM noticias
ORDER BY publicado_en DESC
LIMIT $1 OFFSET $2;

-- name: ObtenerNoticiaPorSlug :one
SELECT * FROM noticias
WHERE slug = $1 LIMIT 1;

-- name: IncrementarVistasNoticia :exec
UPDATE noticias SET vistas = vistas + 1 WHERE slug = $1;

-- name: CrearNoticia :one
INSERT INTO noticias (
    titulo, slug, resumen, contenido_html, categoria,
    banner_filename, meta_title, meta_description, keywords
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;