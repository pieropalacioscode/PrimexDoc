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

export interface Examen {
  id: string;
  titulo: string;
  descripcion?: string;
  area: string; // Inicial, Primaria, Secundaria, etc.
  duracion_minutos: number;
  es_demo: boolean;
  total_preguntas?: number;
}

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

export interface Alternativa {
  id: string;
  letra: 'A' | 'B' | 'C' | 'D';
  texto: string;
}

export interface Pregunta {
  id: string;
  numero: number;
  enunciado: string;
  contexto?: string; // Caso o situación pedagógica previa
  alternativas: Alternativa[];
}

export interface ExamenDetalle extends Examen {
  preguntas: Pregunta[];
}

export interface RespuestaEnvio {
  pregunta_id: string;
  alternativa_id: string;
}

export interface EnvioSimulacroRequest {
  examen_id: string;
  tiempo_empleado_segundos: number;
  respuestas: RespuestaEnvio[];
}

export interface ResultadoEvaluacion {
  evaluacion_id: string;
  puntaje_total: number;
  puntaje_maximo: number;
  porcentaje: number;
  respuestas_correctas: number;
  respuestas_incorrectas: number;
  respuestas_omitidas: number;
  aprobado: boolean;
}

export interface DetalleRespuestaEvaluacion {
  pregunta_id: string;
  enunciado: string;
  contexto?: string;
  alternativa_seleccionada_id?: string;
  alternativa_correcta_id: string;
  es_correcta: boolean;
  explicacion: string; // Explicación o argumento pedagógico oficial MINEDU
  alternativas: Alternativa[];
}

export interface ResultadoDetallado extends ResultadoEvaluacion {
  examen_titulo: string;
  tiempo_empleado_segundos: number;
  fecha: string;
  detalles: DetalleRespuestaEvaluacion[];
}