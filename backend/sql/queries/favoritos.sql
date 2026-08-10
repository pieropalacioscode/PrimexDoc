-- name: GuardarExamen :exec
INSERT INTO examenes_guardados (usuario_id, examen_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: EliminarExamenGuardado :exec
DELETE FROM examenes_guardados
WHERE usuario_id = $1 AND examen_id = $2;

-- name: ListarExamenesGuardados :many
SELECT e.id, e.titulo, e.nivel, e.tipo, e.anio, e.total_preguntas, e.duracion_minutos
FROM examenes e
JOIN examenes_guardados eg ON e.id = eg.examen_id
WHERE eg.usuario_id = $1
ORDER BY eg.creado_en DESC;

-- name: EsExamenGuardado :one
SELECT EXISTS (
    SELECT 1 FROM examenes_guardados 
    WHERE usuario_id = $1 AND examen_id = $2
);