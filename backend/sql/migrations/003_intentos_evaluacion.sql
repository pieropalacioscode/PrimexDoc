-- 1. Agregar columnas necesarias en la tabla de preguntas (si no existen)
ALTER TABLE preguntas 
ADD COLUMN IF NOT EXISTS opcion_correcta_id UUID REFERENCES opciones(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS explicacion TEXT;

-- 2. Crear tabla de intentos de examen
CREATE TABLE IF NOT EXISTS intentos_examen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    modo VARCHAR(20) NOT NULL CHECK (modo IN ('simulacro', 'practica')),
    total_preguntas INT NOT NULL DEFAULT 0,
    preguntas_correctas INT NOT NULL DEFAULT 0,
    preguntas_incorrectas INT NOT NULL DEFAULT 0,
    puntaje NUMERIC(5, 2) DEFAULT 0.00,
    tiempo_empleado_segundos INT NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completado', 'cancelado')),
    iniciado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_en TIMESTAMPTZ
);

-- 3. Crear tabla para registrar las respuestas de cada intento
CREATE TABLE IF NOT EXISTS respuestas_intento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intento_id UUID NOT NULL REFERENCES intentos_examen(id) ON DELETE CASCADE,
    pregunta_id UUID NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    opcion_seleccionada_id UUID REFERENCES opciones(id) ON DELETE SET NULL,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_intento_pregunta UNIQUE (intento_id, pregunta_id)
);

-- 4. Índices para optimizar consultas rápidas de historial
CREATE INDEX IF NOT EXISTS idx_intentos_usuario ON intentos_examen(usuario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_intento ON respuestas_intento(intento_id);