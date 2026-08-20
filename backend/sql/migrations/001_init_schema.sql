
--sql.migrations001_init_schema.sql:
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correo VARCHAR(255) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
    suscripcion_hasta TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Exámenes (Actualizado con columnas para PDF e Importador)
CREATE TABLE examenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    codigo_cuadernillo VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    nivel VARCHAR(50) NOT NULL CHECK (nivel IN ('inicial', 'primaria')),
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('nombramiento', 'ascenso')),
    anio INT NOT NULL,
    total_preguntas INT NOT NULL DEFAULT 60,
    duracion_minutos INT NOT NULL DEFAULT 180,
    -- Nuevas columnas solicitadas por el importador
    acceso_pdf VARCHAR(50),               -- 'libre', 'premium'
    url_pdf_examen TEXT,                  -- Link a Cloudflare R2
    url_pdf_claves TEXT,                  -- Link a Cloudflare R2
    completo BOOLEAN DEFAULT TRUE,
    fuente_habilidades_generales VARCHAR(255),
    url_origen_habilidades_generales TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_examenes_filtro ON examenes(nivel, tipo, anio);

-- 3. Textos Base (Actualizado con url_imagen)
CREATE TABLE textos_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    codigo_texto_base VARCHAR(50) NOT NULL,
    titulo VARCHAR(255),
    contenido TEXT NOT NULL,
    url_imagen TEXT, -- Para casos pedagógicos con infografías
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_codigo_texto_base_por_examen UNIQUE (examen_id, codigo_texto_base)
);

-- 4. Preguntas (Actualizado con subprueba y componente)
CREATE TABLE preguntas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    examen_id UUID REFERENCES examenes(id) ON DELETE CASCADE,
    texto_base_id UUID REFERENCES textos_base(id) ON DELETE SET NULL,
    numero_pregunta INT NOT NULL,
    texto_pregunta TEXT NOT NULL,
    url_imagen TEXT,
    explicacion TEXT,
    subprueba VARCHAR(100), -- Ej: 'Conocimientos Pedagógicos'
    componente VARCHAR(100), -- Ej: 'Comprensión Lectora'
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_pregunta_por_examen UNIQUE (examen_id, numero_pregunta)
);

-- 5. Opciones (Etiqueta A, B, C)
CREATE TABLE opciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pregunta_id UUID REFERENCES preguntas(id) ON DELETE CASCADE,
    etiqueta VARCHAR(10) NOT NULL,
    texto_opcion TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT unique_etiqueta_por_pregunta UNIQUE (pregunta_id, etiqueta)
);

-- 6. Intentos
CREATE TABLE intentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    examen_id UUID REFERENCES examenes(id) ON DELETE CASCADE,
    modo VARCHAR(50) NOT NULL DEFAULT 'simulacro' CHECK (modo IN ('practica', 'simulacro')),
    puntaje DECIMAL(5, 2) DEFAULT 0.00,
    total_preguntas INT NOT NULL,
    preguntas_correctas INT DEFAULT 0,
    preguntas_incorrectas INT DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'en_progreso' CHECK (estado IN ('en_progreso', 'completado')),
    iniciado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalizado_en TIMESTAMP WITH TIME ZONE
);

-- 7. Respuestas por Intento
CREATE TABLE respuestas_intento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intento_id UUID REFERENCES intentos(id) ON DELETE CASCADE,
    pregunta_id UUID REFERENCES preguntas(id) ON DELETE CASCADE,
    opcion_seleccionada_id UUID REFERENCES opciones(id) ON DELETE CASCADE,
    es_correcta BOOLEAN NOT NULL,
    respondido_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_intento_pregunta UNIQUE (intento_id, pregunta_id)
);

-- 8. Favoritos (Fase 10 - Indispensable)
CREATE TABLE examenes_guardados (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    examen_id UUID REFERENCES examenes(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, examen_id)
);

-- 9. Recuperación de Contraseña
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correo VARCHAR(255) NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP

);

-- 1. ANALÍTICA MACRO (Radar)
-- name: GetAnaliticaSubprueba :many
SELECT 
    COALESCE(NULLIF(p.subprueba, ''), 'General')::TEXT as subprueba,
    COUNT(ri.id)::BIGINT as total_preguntas,
    SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::BIGINT as correctas,
    -- Forzamos a BIGINT después del ROUND para evitar decimales en Go
    ROUND(
        (SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(ri.id), 0)::float) * 100
    )::BIGINT as porcentaje_exito
FROM respuestas_intento ri
JOIN preguntas p ON ri.pregunta_id = p.id
WHERE ri.intento_id = $1
GROUP BY p.subprueba;

-- name: GetAnaliticaComponente :many
SELECT 
    COALESCE(NULLIF(p.componente, ''), 'General')::TEXT as componente,
    COUNT(ri.id)::BIGINT as total,
    SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::BIGINT as aciertos,
    -- Mismo casting aquí para robustez
    ROUND(
        (SUM(CASE WHEN ri.es_correcta = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(ri.id), 0)::float) * 100
    )::BIGINT as porcentaje
FROM respuestas_intento ri
JOIN preguntas p ON ri.pregunta_id = p.id
WHERE ri.intento_id = $1
GROUP BY p.componente
ORDER BY porcentaje ASC;

CREATE INDEX idx_password_resets_valido ON password_resets(correo, codigo) WHERE usado = FALSE;
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS subprueba VARCHAR(255) DEFAULT '';
ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS componente VARCHAR(255) DEFAULT '';

