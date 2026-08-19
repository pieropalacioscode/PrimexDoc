-- name: ObtenerAnaliticaPorIntento :many
-- Devuelve el rendimiento desglosado por subprueba (Comprensión, Razonamiento, etc.)
-- name: ObtenerAnaliticaPorIntento :many
SELECT 
    p.subprueba,
    COUNT(ri.pregunta_id)::bigint as total_preguntas,
    COUNT(ri.pregunta_id) FILTER (WHERE ri.es_correcta = TRUE)::bigint as correctas,
    (COUNT(ri.pregunta_id) FILTER (WHERE ri.es_correcta = TRUE)::float / COUNT(ri.pregunta_id)::float) * 100 as porcentaje_exito
FROM respuestas_intento ri
JOIN preguntas p ON ri.pregunta_id = p.id
WHERE ri.intento_id = $1
GROUP BY p.subprueba;

-- name: ObtenerAnaliticaDetalladaPorComponente :many
SELECT 
    p.componente,
    COUNT(ri.pregunta_id)::bigint as total,
    COUNT(ri.pregunta_id) FILTER (WHERE ri.es_correcta = TRUE)::bigint as aciertos
FROM respuestas_intento ri
JOIN preguntas p ON ri.pregunta_id = p.id
WHERE ri.intento_id = $1
GROUP BY p.componente
ORDER BY aciertos ASC;

-- name: ObtenerProgresoHistorico :many
-- Para el gráfico de líneas (últimos 10 intentos)
SELECT 
    i.id,
    i.iniciado_en,
    i.puntaje,
    e.titulo as examen_titulo
FROM intentos_examen i
JOIN examenes e ON i.examen_id = e.id
WHERE i.usuario_id = $1 AND i.estado = 'completado'
ORDER BY i.iniciado_en DESC
LIMIT 10;