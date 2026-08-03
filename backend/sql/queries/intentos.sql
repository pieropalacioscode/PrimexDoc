--intentos.sql:
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
-- name: ObtenerIntentoPorID :one
SELECT 
    i.id, i.examen_id, e.titulo AS examen_titulo, i.modo, i.puntaje, 
    i.total_preguntas, i.preguntas_correctas, i.preguntas_incorrectas, 
    i.tiempo_empleado_segundos, -- 👈 AQUÍ ESTÁ LA MAGIA DEL TIEMPO
    i.estado, i.iniciado_en, i.finalizado_en
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
    tiempo_empleado_segundos = $5,
    estado = 'completado',
    finalizado_en = NOW()
WHERE id = $1 AND usuario_id = $6;

-- name: ListarIntentosPorUsuario :many
SELECT 
    i.id, i.examen_id, e.titulo AS examen_titulo, e.nivel, e.tipo, e.anio, i.modo, 
    i.puntaje, i.total_preguntas, i.preguntas_correctas, i.preguntas_incorrectas, 
    i.tiempo_empleado_segundos, -- 👈 PARA MOSTRAR TIEMPOS EN EL HISTORIAL
    i.estado, i.iniciado_en, i.finalizado_en
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

-- name: ObtenerDetalleResultado :many
SELECT 
    p.id AS pregunta_id, 
    p.numero_pregunta, 
    p.texto_pregunta AS enunciado, 
    tb.id AS texto_base_id, 
    tb.titulo AS texto_base_titulo,
    tb.contenido AS texto_base_contenido,
    p.explicacion, 
    ri.opcion_seleccionada_id, 
    o_correcta.id AS opcion_correcta_id, 
    ri.es_correcta,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'id', o.id,
            'etiqueta', o.etiqueta,
            'texto_opcion', o.texto_opcion
        ) ORDER BY o.etiqueta ASC)
        FROM opciones o
        WHERE o.pregunta_id = p.id
    ) AS opciones_json
FROM respuestas_intento ri
JOIN preguntas p ON ri.pregunta_id = p.id
LEFT JOIN textos_base tb ON p.texto_base_id = tb.id
LEFT JOIN opciones o_correcta ON o_correcta.pregunta_id = p.id AND o_correcta.es_correcta = TRUE
WHERE ri.intento_id = $1
ORDER BY p.numero_pregunta ASC;