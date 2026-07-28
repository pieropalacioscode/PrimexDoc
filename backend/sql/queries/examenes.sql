-- name: ListExamenesActivos :many
SELECT id, titulo, codigo_cuadernillo, descripcion, nivel, tipo, anio, total_preguntas, duracion_minutos
FROM examenes
WHERE activo = true
ORDER BY anio DESC, titulo ASC;

-- name: GetExamenByID :one
SELECT id, titulo, codigo_cuadernillo, descripcion, nivel, tipo, anio, total_preguntas, duracion_minutos
FROM examenes
WHERE id = $1 AND activo = true
LIMIT 1;

-- name: GetTextosBaseByExamenID :many
SELECT id, examen_id, codigo_texto_base, titulo, contenido
FROM textos_base
WHERE examen_id = $1
ORDER BY codigo_texto_base ASC;

-- name: GetPreguntasByExamenID :many
SELECT id, examen_id, texto_base_id, numero_pregunta, texto_pregunta, url_imagen, explicacion
FROM preguntas
WHERE examen_id = $1
ORDER BY numero_pregunta ASC;

-- name: GetOpcionesByPreguntaIDs :many
SELECT id, pregunta_id, etiqueta, texto_opcion, es_correcta
FROM opciones
WHERE pregunta_id = ANY($1::uuid[])
ORDER BY etiqueta ASC;