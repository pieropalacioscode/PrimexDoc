-- name: IniciarIntento :one
INSERT INTO intentos_examen (
    usuario_id,
    examen_id,
    modo,
    total_preguntas,
    estado
) VALUES (
    $1, $2, $3, $4, 'en_progreso'
)
RETURNING id, examen_id, modo, total_preguntas, estado, iniciado_en;

-- name: ObtenerIntentoPorID :one
SELECT 
    i.id,
    i.examen_id,
    e.titulo AS examen_titulo,
    i.modo,
    i.puntaje,
    i.total_preguntas,
    i.preguntas_correctas,
    i.preguntas_incorrectas,
    i.estado,
    i.iniciado_en,
    i.finalizado_en
FROM intentos_examen i
JOIN examenes e ON i.examen_id = e.id
WHERE i.id = $1 AND i.usuario_id = $2;

-- name: GetClavesYExplicacionesByExamenID :many
SELECT 
    p.id AS pregunta_id,
    p.numero_pregunta,
    COALESCE(o.id, '00000000-0000-0000-0000-000000000000'::uuid) AS opcion_correcta_id,
    p.explicacion
FROM preguntas p
LEFT JOIN opciones o ON o.pregunta_id = p.id AND o.es_correcta = TRUE
WHERE p.examen_id = $1;

-- name: RegistrarRespuestaIntento :exec
INSERT INTO respuestas_intento (
    intento_id,
    pregunta_id,
    opcion_seleccionada_id,
    es_correcta
) VALUES (
    $1, $2, $3, $4
)
ON CONFLICT (intento_id, pregunta_id) 
DO UPDATE SET 
    opcion_seleccionada_id = EXCLUDED.opcion_seleccionada_id,
    es_correcta = EXCLUDED.es_correcta;

-- name: FinalizarIntento :exec
UPDATE intentos_examen
SET 
    puntaje = $2,
    preguntas_correctas = $3,
    preguntas_incorrectas = $4,
    estado = 'completado',
    finalizado_en = NOW()
WHERE id = $1 AND usuario_id = $5;

-- name: ListarIntentosPorUsuario :many
SELECT 
    i.id,
    i.examen_id,
    e.titulo AS examen_titulo,
    e.nivel,
    e.tipo,
    e.anio,
    i.modo,
    i.puntaje,
    i.total_preguntas,
    i.preguntas_correctas,
    i.preguntas_incorrectas,
    i.estado,
    i.iniciado_en,
    i.finalizado_en
FROM intentos_examen i
JOIN examenes e ON i.examen_id = e.id
WHERE i.usuario_id = $1
ORDER BY i.iniciado_en DESC;

-- name: GetRespuestasPorIntentoID :many
SELECT 
    pregunta_id,
    opcion_seleccionada_id,
    es_correcta
FROM respuestas_intento
WHERE intento_id = $1;