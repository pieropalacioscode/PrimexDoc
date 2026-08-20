-- name: ObtenerAnaliticaPorIntento :many
-- Devuelve el rendimiento desglosado por subprueba (Comprensión, Razonamiento, etc.)
-- name: ObtenerAnaliticaPorIntento :many
SELECT 
    COALESCE(NULLIF(p.subprueba, ''), 'General')::TEXT as subprueba,
    COUNT(ri.id)::BIGINT as total_preguntas,
    SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::BIGINT as correctas,
    -- CAMBIO: Calculamos y devolvemos como FLOAT directamente
    ((SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(ri.id), 0)::FLOAT) * 100)::FLOAT as porcentaje_exito
FROM respuestas_intento ri
JOIN preguntas p ON ri.pregunta_id = p.id
WHERE ri.intento_id = $1
GROUP BY p.subprueba;

-- name: ObtenerAnaliticaDetalladaPorComponente :many
SELECT 
    COALESCE(NULLIF(p.componente, ''), 'General')::TEXT as componente,
    COUNT(ri.id)::BIGINT as total,
    SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::BIGINT as aciertos,
    -- CAMBIO: Calculamos y devolvemos como FLOAT
    ((SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(ri.id), 0)::FLOAT) * 100)::FLOAT as porcentaje
FROM respuestas_intento ri
JOIN preguntas p ON ri.pregunta_id = p.id
WHERE ri.intento_id = $1
GROUP BY p.componente
ORDER BY porcentaje ASC;

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