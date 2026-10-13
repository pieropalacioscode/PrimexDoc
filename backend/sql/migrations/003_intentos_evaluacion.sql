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

--5
-- 1. Si existe la tabla 'intentos' (vacía), bórrala para evitar confusiones
DROP TABLE IF EXISTS intentos;

-- 2. Asegurarnos que 'intentos_examen' tenga la columna de tiempo (que usas en SQLC)
ALTER TABLE intentos_examen
ADD COLUMN IF NOT EXISTS tiempo_empleado_segundos INTEGER DEFAULT 0;

-- 3. Crear la tabla de Favoritos (Fase 10)
CREATE TABLE IF NOT EXISTS examenes_guardados (
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, examen_id)
);

-- 1. Crear el tipo ENUM para clasificar el soporte
CREATE TYPE tipo_soporte AS ENUM ('RECLAMO', 'QUEJA', 'SUGERENCIA', 'ERROR_CONTENIDO');
CREATE TYPE estado_soporte AS ENUM ('PENDIENTE', 'EN_PROCESO', 'RESUELTO');

-- 2. Crear la tabla maestra
CREATE TABLE soporte_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_ticket VARCHAR(20) UNIQUE NOT NULL, -- Ej: REC-2026-1234
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    nombre_completo TEXT NOT NULL,
    dni_ce VARCHAR(15), -- Obligatorio para RECLAMO/QUEJA
    correo TEXT NOT NULL,
    tipo tipo_soporte NOT NULL,
    asunto TEXT NOT NULL,
    detalle TEXT NOT NULL,
    metadata JSONB, -- Para guardar { "examen_id": "...", "pregunta_id": "..." }
    estado estado_soporte DEFAULT 'PENDIENTE',
    leido_por_admin BOOLEAN DEFAULT FALSE, -- 🚨 LA BASE DE TU ALERTA
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para que el panel de admin vuele
CREATE INDEX idx_soporte_leido ON soporte_tickets(leido_por_admin);
CREATE INDEX idx_soporte_tipo ON soporte_tickets(tipo);