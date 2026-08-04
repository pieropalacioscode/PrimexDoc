-- 001_init_schema.sql Habilitar extensión UUID para identificadores seguros
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios (Docentes)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correo VARCHAR(255) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
    suscripcion_hasta TIMESTAMP WITH TIME ZONE, -- Control de acceso 24/7 (S/ 20 PEN)
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Simulacros / Exámenes Oficiales
CREATE TABLE examenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(255) NOT NULL,
    codigo_cuadernillo VARCHAR(100) UNIQUE NOT NULL, -- Obligatorio para trazabilidad
    descripcion TEXT,
    nivel VARCHAR(50) NOT NULL CHECK (nivel IN ('inicial', 'primaria')),
    tipo VARCHAR(50) NOT NULL DEFAULT 'nombramiento' CHECK (tipo IN ('nombramiento', 'ascenso')),
    anio INT NOT NULL,
    total_preguntas INT NOT NULL DEFAULT 60,
    duracion_minutos INT NOT NULL DEFAULT 180,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_examenes_filtro ON examenes(nivel, tipo, anio);

-- 3. Tabla de Textos Base / Casos Pedagógicos Compartidos
CREATE TABLE textos_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    examen_id UUID NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
    codigo_texto_base VARCHAR(50) NOT NULL,
    titulo VARCHAR(255),
    contenido TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_codigo_texto_base_por_examen UNIQUE (examen_id, codigo_texto_base)
);
CREATE INDEX idx_textos_base_examen ON textos_base(examen_id);

-- 4. Tabla de Preguntas del Examen
CREATE TABLE preguntas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    examen_id UUID REFERENCES examenes(id) ON DELETE CASCADE,
    texto_base_id UUID REFERENCES textos_base(id) ON DELETE SET NULL, -- FK a la lectura compartida
    numero_pregunta INT NOT NULL,
    texto_pregunta TEXT NOT NULL,
    url_imagen TEXT, -- Cloudflare R2
    explicacion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_pregunta_por_examen UNIQUE (examen_id, numero_pregunta)
);
CREATE INDEX idx_preguntas_examen ON preguntas(examen_id);
CREATE INDEX idx_preguntas_texto_base ON preguntas(texto_base_id);

-- 5. Tabla de Opciones / Alternativas
CREATE TABLE opciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pregunta_id UUID REFERENCES preguntas(id) ON DELETE CASCADE,
    etiqueta VARCHAR(10) NOT NULL,
    texto_opcion TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT unique_etiqueta_por_pregunta UNIQUE (pregunta_id, etiqueta)
);
CREATE INDEX idx_opciones_pregunta ON opciones(pregunta_id);

-- 6. Tabla de Intentos (Historial)
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
CREATE INDEX idx_intentos_usuario_estado ON intentos(usuario_id, estado);

-- 7. Tabla de Respuestas por Intento
CREATE TABLE intento_respuestas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intento_id UUID REFERENCES intentos(id) ON DELETE CASCADE,
    pregunta_id UUID REFERENCES preguntas(id) ON DELETE CASCADE,
    opcion_seleccionada_id UUID REFERENCES opciones(id) ON DELETE CASCADE,
    es_correcta BOOLEAN NOT NULL,
    respondido_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_intento_pregunta UNIQUE (intento_id, pregunta_id)
);
CREATE INDEX idx_intento_respuestas_intento ON intento_respuestas(intento_id);

CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    correo VARCHAR(255) NOT NULL,
    codigo VARCHAR(6) NOT NULL,
    expira_en TIMESTAMP WITH TIME ZONE NOT NULL,
    usado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_password_resets_valido ON password_resets(correo, codigo) WHERE usado = FALSE;