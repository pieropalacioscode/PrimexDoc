--examenes.sql

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

-- name: GetExamenDetalleEntrenamiento :many
SELECT 
    e.id AS examen_id, e.titulo, e.duracion_minutos,
    p.id AS pregunta_id, p.numero_pregunta, p.texto_pregunta, p.url_imagen AS pregunta_imagen, 
    p.explicacion, p.subprueba, p.componente, p.texto_base_id,
    o.id AS opcion_id, o.etiqueta, o.texto_opcion, o.es_correcta,
    t.id AS texto_id, t.codigo_texto_base, -- <--- AGREGAR ESTA LÍNEA
    t.titulo AS texto_titulo, t.contenido AS texto_contenido, t.url_imagen AS texto_imagen
FROM examenes e
JOIN preguntas p ON e.id = p.examen_id
JOIN opciones o ON p.id = o.pregunta_id
LEFT JOIN textos_base t ON p.texto_base_id = t.id
WHERE e.id = $1
ORDER BY p.numero_pregunta, o.etiqueta;