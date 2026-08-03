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
  mensaje?: string;
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
  etiqueta?: string;                      // 'A', 'B', 'C', 'D'
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
  
  // Soporte dual para enunciados/preguntas
  texto_pregunta?: string;
  enunciado?: string;                   // Retrocompatibilidad
  contexto?: string;                    // Caso pedagógico o situación previa
  
  texto_base_id?: string | null;
  url_imagen?: string | null;
  explicacion?: string | null;
  
  // Soporte dual para listas de alternativas u opciones
  opciones?: Opcion[];
  alternativas?: Alternativa[] | Opcion[]; // Retrocompatibilidad
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
export interface ExamenCompleto extends Omit<Examen, 'nivel' | 'tipo' | 'anio'> {
  nivel?: string;
  tipo?: string;
  anio?: number | string;
}

export interface ExamenDetalle extends Examen {
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