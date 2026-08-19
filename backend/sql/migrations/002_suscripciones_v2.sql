CREATE TYPE tipo_plan AS ENUM ('mensual', 'semestral', 'anual');
CREATE TYPE estado_suscripcion AS ENUM ('activa', 'vencida', 'cancelada');

CREATE TABLE suscripciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plan tipo_plan NOT NULL DEFAULT 'mensual',
    monto NUMERIC(6,2) NOT NULL,
    estado estado_suscripcion DEFAULT 'activa',
    metodo_pago VARCHAR(30) DEFAULT 'yape',
    numero_operacion VARCHAR(50),
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_susc_activa ON suscripciones(usuario_id) WHERE estado = 'activa' AND fecha_expiracion > NOW();


-- Índices para acelerar el agrupamiento por subprueba y componente
CREATE INDEX IF NOT EXISTS idx_preguntas_subprueba ON preguntas(subprueba);
CREATE INDEX IF NOT EXISTS idx_preguntas_componente ON preguntas(componente);

-- Índice para acelerar el cálculo de aciertos por intento
CREATE INDEX IF NOT EXISTS idx_respuestas_intento_es_correcta ON respuestas_intento(intento_id, es_correcta);