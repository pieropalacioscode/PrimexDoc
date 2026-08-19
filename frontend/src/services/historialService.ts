// frontend/src/services/historialService.ts
import { fetchAPI } from './api';

// Definimos la respuesta completa del Backend
interface HistorialResponse {
  intentos: IntentoExamen[];
  total: number;
}

export interface IntentoExamen {
  id: string;
  examen_id: string;
  examen_titulo: string;
  nivel: string;
  tipo: string;
  anio: number;
  modo: string;
  puntaje: number;
  total_preguntas: number;
  preguntas_correctas: number;
  preguntas_incorrectas: number;
  tiempo_empleado_segundos: number;
  estado: 'en_progreso' | 'completado';
  iniciado_en: string;
  finalizado_en: string | null;
}

export const getHistorial = async (): Promise<IntentoExamen[]> => {
  // Extraemos solo el array 'intentos' de la respuesta del backend
  const data = await fetchAPI<HistorialResponse>('/intentos');
  return data.intentos || []; // Nos aseguramos de devolver siempre un array
};


export const getDetalleResultado = async (intentoId: string) => {
  return fetchAPI(`/intentos/${intentoId}/resultados`);
};

export const toggleFavorito = async (examenId: string) => {
  // Como fetchAPI usa GET por defecto, aquí especificamos POST
  return fetchAPI(`/favoritos/${examenId}`, {
    method: 'POST',
  });
};
export interface ExamenResumen {
  id: string;
  titulo: string;
  nivel: string;
  tipo: string;
  anio: number;
  total_preguntas: number;
  duracion_minutos: number;
}

export const getFavoritos = async (): Promise<ExamenResumen[]> => {
  return fetchAPI<ExamenResumen[]>('/favoritos');
};


// Define el tipo de datos que viene del backend
export interface AnaliticaIntento {
  intento_id: string;
  por_subprueba: {
    subprueba: string;
    total_preguntas: number;
    correctas: number;
    porcentaje_exito: number;
  }[];
  por_componente: {
    componente: string;
    total: number;
    aciertos: number;
  }[];
  debilidades: string[];
  recomendacion: string;
}

// Nueva función en el service
export const getAnaliticaIntento = async (intentoId: string): Promise<AnaliticaIntento> => {
  return fetchAPI<AnaliticaIntento>(`/analitica/intento/${intentoId}`);
};