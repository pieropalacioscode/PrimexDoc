// frontend/src/types/index.ts

// ==========================================
// 1. AUTENTICACIÓN Y USUARIO
// ==========================================
export interface Usuario {
  id: string;
  correo: string;
  nombre_completo?: string;
  rol: 'usuario' | 'admin';
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

// ==========================================
// 2. SUSCRIPCIÓN Y PAYWALL
// ==========================================
export interface EstadoSuscripcion {
  tiene_acceso: boolean;
  plan?: 'mensual' | 'semestral' | 'anual';
  fecha_expiracion?: string;
  activo?:boolean
  mensaje?: string;
   suscripcion_hasta?: string;
}

export interface PaywallErrorResponse {
  error: string;
  code: string;
  action_url: string;
}

// ==========================================
// 3. TEXTO BASE (LECTURA COMPARTIDA)
// ==========================================
export interface TextoBase {
  id: string;
  codigo_texto_base?: string;
  titulo?: string | null;
  contenido: string;
  url_imagen?: string | null;
}

// ==========================================
// 4. OPCIONES Y ALTERNATIVAS (SOPORTE DUAL)
// ==========================================
export interface Opcion {
  id: string;
  pregunta_id?: string;
  etiqueta: string;                      // 'A', 'B', 'C', 'D'
  letra?: 'A' | 'B' | 'C' | 'D' | string; // Alias retrocompatible
  texto_opcion?: string;
  texto?: string;                         // Alias retrocompatible
  es_correcta?: boolean;
}

// Alias de compatibilidad para componentes que importan 'Alternativa'
export interface Alternativa {
  id: string;
  letra: 'A' | 'B' | 'C' | 'D' | string;
  texto: string;
  etiqueta?: string;
  texto_opcion?: string;
}

// ==========================================
// 5. PREGUNTAS Y EXAMEN (UNIFICADO)
// ==========================================
export interface Pregunta {
  id: string;
  examen_id?: string;
  numero?: number;
  numero_pregunta?: number;

  // Contenido principal
  texto_pregunta?: string;
  enunciado?: string;                   // Retrocompatibilidad
  contexto?: string;                    // Situación previa

  // Metadatos MINEDU (Fase 13 - Lo nuevo)
  subprueba?: string | null;            // Ej: "Conocimientos Pedagógicos..."
  componente?: string | null;           // Ej: "Evaluación", "Planificación"

  // Soporte de Media y Retroalimentación
  texto_base_id?: string | null;
  url_imagen?: string | null;
  explicacion?: string | null;

  // Estructuras de respuesta
  opciones?: Opcion[];
  alternativas?: Alternativa[] | Opcion[]; // Retrocompatibilidad
}
export interface ExamenResponse {
  id: string;
  titulo: string;
  codigo_cuadernillo: string;
  preguntas: Pregunta[];
}
export interface Examen {
  id: string;
  titulo: string;
  codigo_cuadernillo: string;
  descripcion?: string;
  area?: string;                        // Inicial, Primaria, Secundaria, etc.
  nivel?: string;
  tipo?: string;
  anio?: number;
  duracion_minutos: number;
  es_demo?: boolean;
  total_preguntas?: number;
}

// src/types/index.ts

export interface ExamenCompleto extends Omit<Examen, 'nivel' | 'tipo' | 'anio' | 'codigo_cuadernillo'> {
  nivel?: string;
  tipo?: string;
  anio?: number | string;
  codigo_cuadernillo?: string;
  imagen_portada?: string | null;
  area?: string;
  descripcion?: string;
  es_gratuito?: boolean;
}

export interface ExamenDetalle extends Examen {
  id:string;
  titulo:string;
  duracion_minutos:number;
  textos_base?: TextoBase[];
  preguntas: Pregunta[];
}

// ==========================================
// 6. RESPUESTAS Y ENVÍO DE SIMULACRO
// ==========================================
export interface RespuestaEnvio {
  pregunta_id: string;
  alternativa_id?: string;
  opcion_seleccionada_id?: string;
}

export interface EnvioSimulacroRequest {
  examen_id: string;
  tiempo_empleado_segundos: number;
  respuestas: RespuestaEnvio[];
}

// ==========================================
// 7. RESULTADOS Y EVALUACIÓN
// ==========================================
export interface ResultadoEvaluacion {
  evaluacion_id?: string;
  intento_id?: string;
  puntaje_total?: number;
  puntaje_maximo?: number;
  porcentaje?: number;
  respuestas_correctas: number;
  respuestas_incorrectas: number;
  respuestas_omitidas?: number;
  aprobado?: boolean;
}

export interface DetalleRespuestaEvaluacion {
  pregunta_id: string;
  enunciado?: string;
  texto_pregunta?: string;
  contexto?: string;
  alternativa_seleccionada_id?: string;
  opcion_seleccionada_id?: string;
  alternativa_correcta_id?: string;
  es_correcta: boolean;
  explicacion?: string;                 // Explicación argumento MINEDU
  alternativas?: Alternativa[] | Opcion[];
  opciones?: Opcion[];
}

export interface ResultadoDetallado extends ResultadoEvaluacion {
  examen_titulo?: string;
  tiempo_empleado_segundos?: number;
  fecha?: string;
  detalles?: DetalleRespuestaEvaluacion[];
}

export interface IntentoResumen {
  id: string;
  examen_id: string;
  examen_titulo?: string;
  modo: string;
  puntaje: number;
  total_preguntas: number;
  preguntas_correctas: number;
  preguntas_incorrectas: number;
  tiempo_empleado_segundos?: number; // 👈 ¡AÑADE ESTA PROPIEDAD!
  estado: string;
  iniciado_en: string;
  finalizado_en?: string;
}

// frontend/src/types/index.ts

// ==========================================
// 1. AUTENTICACIÓN Y USUARIO
// ==========================================
export interface Usuario {
  id: string;
  correo: string;
  nombre_completo?: string;
  rol: 'usuario' | 'admin';
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

// ==========================================
// 2. SUSCRIPCIÓN Y PAYWALL
// ==========================================
export interface EstadoSuscripcion {
  tiene_acceso: boolean;
  plan?: 'mensual' | 'semestral' | 'anual';
  fecha_expiracion?: string;
  activo?:boolean
  mensaje?: string;
   suscripcion_hasta?: string;
}

export interface PaywallErrorResponse {
  error: string;
  code: string;
  action_url: string;
}

// ==========================================
// 3. TEXTO BASE (LECTURA COMPARTIDA)
// ==========================================
export interface TextoBase {
  id: string;
  codigo_texto_base?: string;
  titulo?: string | null;
  contenido: string;
  url_imagen?: string | null;
}

// ==========================================
// 4. OPCIONES Y ALTERNATIVAS (SOPORTE DUAL)
// ==========================================
export interface Opcion {
  id: string;
  pregunta_id?: string;
  etiqueta: string;                      // 'A', 'B', 'C', 'D'
  letra?: 'A' | 'B' | 'C' | 'D' | string; // Alias retrocompatible
  texto_opcion?: string;
  texto?: string;                         // Alias retrocompatible
  es_correcta?: boolean;
}

// Alias de compatibilidad para componentes que importan 'Alternativa'
export interface Alternativa {
  id: string;
  letra: 'A' | 'B' | 'C' | 'D' | string;
  texto: string;
  etiqueta?: string;
  texto_opcion?: string;
}

// ==========================================
// 5. PREGUNTAS Y EXAMEN (UNIFICADO)
// ==========================================
export interface Pregunta {
  id: string;
  examen_id?: string;
  numero?: number;
  numero_pregunta?: number;

  // Contenido principal
  texto_pregunta?: string;
  enunciado?: string;                   // Retrocompatibilidad
  contexto?: string;                    // Situación previa

  // Metadatos MINEDU (Fase 13 - Lo nuevo)
  subprueba?: string | null;            // Ej: "Conocimientos Pedagógicos..."
  componente?: string | null;           // Ej: "Evaluación", "Planificación"

  // Soporte de Media y Retroalimentación
  texto_base_id?: string | null;
  url_imagen?: string | null;
  explicacion?: string | null;

  // Estructuras de respuesta
  opciones?: Opcion[];
  alternativas?: Alternativa[] | Opcion[]; // Retrocompatibilidad
}
export interface ExamenResponse {
  id: string;
  titulo: string;
  codigo_cuadernillo: string;
  preguntas: Pregunta[];
}
export interface Examen {
  id: string;
  titulo: string;
  codigo_cuadernillo: string;
  descripcion?: string;
  area?: string;                        // Inicial, Primaria, Secundaria, etc.
  nivel?: string;
  tipo?: string;
  anio?: number;
  duracion_minutos: number;
  es_demo?: boolean;
  total_preguntas?: number;
}

// src/types/index.ts

export interface ExamenCompleto extends Omit<Examen, 'nivel' | 'tipo' | 'anio' | 'codigo_cuadernillo'> {
  nivel?: string;
  tipo?: string;
  anio?: number | string;
  codigo_cuadernillo?: string;
  imagen_portada?: string | null;
  area?: string;
  descripcion?: string;
}

export interface ExamenDetalle extends Examen {
  id:string;
  titulo:string;
  duracion_minutos:number;
  textos_base?: TextoBase[];
  preguntas: Pregunta[];
}

// ==========================================
// 6. RESPUESTAS Y ENVÍO DE SIMULACRO
// ==========================================
export interface RespuestaEnvio {
  pregunta_id: string;
  alternativa_id?: string;
  opcion_seleccionada_id?: string;
}

export interface EnvioSimulacroRequest {
  examen_id: string;
  tiempo_empleado_segundos: number;
  respuestas: RespuestaEnvio[];
}

// ==========================================
// 7. RESULTADOS Y EVALUACIÓN
// ==========================================
export interface ResultadoEvaluacion {
  evaluacion_id?: string;
  intento_id?: string;
  puntaje_total?: number;
  puntaje_maximo?: number;
  porcentaje?: number;
  respuestas_correctas: number;
  respuestas_incorrectas: number;
  respuestas_omitidas?: number;
  aprobado?: boolean;
}

export interface DetalleRespuestaEvaluacion {
  pregunta_id: string;
  enunciado?: string;
  texto_pregunta?: string;
  contexto?: string;
  alternativa_seleccionada_id?: string;
  opcion_seleccionada_id?: string;
  alternativa_correcta_id?: string;
  es_correcta: boolean;
  explicacion?: string;                 // Explicación argumento MINEDU
  alternativas?: Alternativa[] | Opcion[];
  opciones?: Opcion[];
}

export interface ResultadoDetallado extends ResultadoEvaluacion {
  examen_titulo?: string;
  tiempo_empleado_segundos?: number;
  fecha?: string;
  detalles?: DetalleRespuestaEvaluacion[];
}

export interface IntentoResumen {
  id: string;
  examen_id: string;
  examen_titulo?: string;
  modo: string;
  puntaje: number;
  total_preguntas: number;
  preguntas_correctas: number;
  preguntas_incorrectas: number;
  tiempo_empleado_segundos?: number; // 👈 ¡AÑADE ESTA PROPIEDAD!
  estado: string;
  iniciado_en: string;
  finalizado_en?: string;
}

export interface PreguntaResultado {
  pregunta_id: string;
  numero_pregunta: number;
  enunciado: string;
  texto_base_id?: string | null; // 👈 ¡VITAL PARA QUE FUNCIONE EL BOTÓN DE LECTURAS!
  explicacion: string;
  opcion_seleccionada_id?: string | null;
  opcion_correcta_id?: string | null;
  es_correcta: boolean;
}

export interface Noticia {
  id: string;
  titulo: string;
  slug: string;
  resumen: string;
  contenido_html: string;
  categoria: string;
  banner_filename: string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string;
  vistas: number;
  publicado_en: string;
}


// src/types/index.ts
const CLOUD_NAME = "ubjx67e4";

export const getNoticiaImagen = (source: string | null | undefined, aspect: 'banner' | 'card' = 'banner') => {
  // 1. Fallback: Si no hay nada, logo oficial
  if (!source) {
    return "https://res.cloudinary.com/ubjx67e4/image/upload/v1788506139/ChatGPT_Image_27_ago_2026_09_03_44.png";
  }

  // 2. Si ya es una URL completa (del nuevo script publicar.go), la devolvemos tal cual
  if (source.startsWith('http')) {
    return source;
  }

  // 3. Si es un publicId (datos antiguos), aplicamos la transformación de Cloudinary
  const ratio = aspect === 'banner' ? 'ar_21:9' : 'ar_16:9';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,${ratio},c_fill,g_auto,w_1200/${source}`;
};