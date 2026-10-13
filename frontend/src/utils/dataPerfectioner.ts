import { ExamenCompleto } from '@/types';
import {
  TrendingUp,
  UserPlus,
  GraduationCap,
  BookOpen,
  LucideIcon,
} from 'lucide-react';

export type ExamVariant =
  | 'nombramiento'
  | 'ascenso'
  | 'cpm'
  | 'especialidad';

export interface VariantConfig {
  label: string;
  tipoProceso: string;
  accent: string;
  accentSoft: string;
  accentDark: string;
  icon: LucideIcon;
}

export interface PerfectExamenData {
  id: string;
  tituloLimpio: string;
  anio: string;
  codigo: string;
  variant: ExamVariant;
  nivel: string;
  area: string;
  duracion: number;
  tipoProceso: string;
}

/**
 * Configuración visual y semántica de cada tipo de examen.
 */
export const VARIANT_CONFIG: Record<ExamVariant, VariantConfig> = {
  nombramiento: {
    label: 'Nombramiento',
    tipoProceso: 'Concurso de Nombramiento',
    accent: '#dc2626',
    accentSoft: '#fee2e2',
    accentDark: '#b91c1c',
    icon: UserPlus,
  },

  ascenso: {
    label: 'Ascenso',
    tipoProceso: 'Concurso de Ascenso',
    accent: '#16a34a',
    accentSoft: '#dcfce7',
    accentDark: '#15803d',
    icon: TrendingUp,
  },

  cpm: {
    label: 'Ingreso CPM',
    tipoProceso: 'Ingreso a la Carrera Pública Magisterial',
    accent: '#0284c7',
    accentSoft: '#e0f2fe',
    accentDark: '#0369a1',
    icon: GraduationCap,
  },

  especialidad: {
    label: 'Especialidad',
    tipoProceso: 'Evaluación de Especialidad',
    accent: '#9333ea',
    accentSoft: '#f3e8ff',
    accentDark: '#7e22ce',
    icon: BookOpen,
  },
};

/**
 * Limpia y valida textos provenientes del backend.
 */
const safeText = (
  value: unknown,
  fallback: string
): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();

  if (
    !trimmed ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null'
  ) {
    return fallback;
  }

  return trimmed;
};

/**
 * ─────────────────────────────────────────────
 * DETECCIÓN DE VARIANTE — VERSIÓN ROBUSTA
 * ─────────────────────────────────────────────
 *
 * Se resuelve en 3 capas, de la más a la menos confiable:
 *
 *  1) Campo `tipo` explícito de la base de datos.
 *  2) Token de proceso dentro del código de cuadernillo
 *     (ej: "A05-EBRP-12-AS-PRIM-2023" → token "AS" = Ascenso).
 *  3) Palabras clave en título/descripción (último recurso).
 *
 * La razón del bug original: el paso 3 se usaba SOLO, buscando
 * substrings libres ("nombramiento"/"ascenso") en el texto completo.
 * Muchos textos oficiales citan ambos términos juntos
 * (ej. "Reglamento de Nombramiento y Ascenso"), lo que producía
 * falsos positivos de "nombramiento" aunque el código y el campo
 * `tipo` de la BD dijeran claramente "ascenso".
 */

/**
 * Intenta extraer el proceso desde el código de cuadernillo,
 * partiendo por guiones y buscando tokens conocidos.
 * Es la señal más confiable después del campo `tipo` de la BD,
 * porque sigue un formato estructurado y no depende de redacción libre.
 */
const detectVariantFromCodigo = (
  codigo: string
): ExamVariant | null => {
  if (!codigo) {
    return null;
  }

  const tokens = codigo.toUpperCase().split('-');

  if (tokens.includes('AS') || tokens.includes('ASC')) {
    return 'ascenso';
  }

  if (
    tokens.includes('NM') ||
    tokens.includes('NOM') ||
    tokens.includes('NOMB')
  ) {
    return 'nombramiento';
  }

  if (tokens.includes('CPM')) {
    return 'cpm';
  }

  if (tokens.includes('ESP')) {
    return 'especialidad';
  }

  return null;
};

/**
 * Fallback final: busca palabras clave en título/descripción,
 * usando límites de palabra (\b) para evitar falsos positivos
 * por substrings sueltos.
 */
const detectVariantFromTexto = (
  texto: string
): ExamVariant => {
  const t = texto.toLowerCase();

  const tieneAscenso = /\bascenso\b/.test(t);
  const tieneNombramiento = /\bnombramiento\b/.test(t);

  if (tieneAscenso && !tieneNombramiento) {
    return 'ascenso';
  }

  if (tieneNombramiento && !tieneAscenso) {
    return 'nombramiento';
  }

  if (tieneAscenso && tieneNombramiento) {
    // Texto ambiguo (menciona ambos, típico de reglamentos).
    // Si llegamos hasta aquí es porque ni el campo `tipo` de la BD
    // ni el código de cuadernillo pudieron resolverlo antes.
    // Ascenso como último criterio de desempate, pero lo ideal
    // es no depender de esta rama.
    return 'ascenso';
  }

  if (t.includes('cpm') || t.includes('ingreso')) {
    return 'cpm';
  }

  return 'especialidad';
};

/**
 * Punto de entrada de la detección de variante.
 * Aplica las 3 capas en orden de confiabilidad.
 */
const detectVariant = (
  texto: string,
  codigo: string,
  tipoDb?: unknown
): ExamVariant => {
  // 1) Campo `tipo` de la base de datos, si viene informado.
  const tipoNormalizado = safeText(tipoDb, '').toLowerCase();

  if (tipoNormalizado === 'ascenso') return 'ascenso';
  if (tipoNormalizado === 'nombramiento') return 'nombramiento';
  if (tipoNormalizado === 'cpm') return 'cpm';
  if (tipoNormalizado === 'especialidad') return 'especialidad';

  // 2) Token dentro del código de cuadernillo.
  const desdeCodigo = detectVariantFromCodigo(codigo);
  if (desdeCodigo) {
    return desdeCodigo;
  }

  // 3) Palabras clave en el texto libre (último recurso).
  return detectVariantFromTexto(texto);
};

/**
 * Palabras clave para detectar especialidades docentes.
 */
const ESPECIALIDAD_KEYWORDS: Array<
  [RegExp, string]
> = [
  [
    /INNOVACI[ÓO]N PEDAG[ÓO]GICA/,
    'Profesor de Innovación Pedagógica',
  ],
  [
    /COMUNICACI[ÓO]N/,
    'Comunicación',
  ],
  [
    /MATEM[ÁA]TICA/,
    'Matemática',
  ],
  [
    /EDUCACI[ÓO]N F[ÍI]SICA/,
    'Educación Física',
  ],
  [
    /CIENCIAS? SOCIALES/,
    'Ciencias Sociales',
  ],
  [
    /PERSONAL SOCIAL/,
    'Personal Social',
  ],
  [
    /CIENCIA Y (TECNOLOG[ÍI]A|AMBIENTE)/,
    'Ciencia y Tecnología',
  ],
];

/**
 * Detecta la especialidad docente.
 */
const detectEspecialidad = (
  texto: string
): string | null => {
  const t = texto.toUpperCase();

  for (const [regex, label] of ESPECIALIDAD_KEYWORDS) {
    if (regex.test(t)) {
      return label;
    }
  }

  return null;
};

/**
 * Normaliza los datos de un examen para que
 * el frontend reciba una estructura consistente.
 */
export const perfectExamenData = (
  ex: ExamenCompleto
): PerfectExamenData => {
  const tituloRaw = ex.titulo || '';

  const descripcionRaw =
    (ex as any).descripcion || '';

  const textoCompleto =
    `${tituloRaw} ${descripcionRaw}`.trim();

  // ─────────────────────────────────────────────
  // AÑO
  // ─────────────────────────────────────────────

  const yearMatch =
    textoCompleto.match(/\b(20\d{2})\b/);

  const anioRaw =
    (ex as any).anio
      ? String((ex as any).anio)
      : '';

  const anio = safeText(
    anioRaw,
    yearMatch ? yearMatch[0] : '2024'
  );

  // ─────────────────────────────────────────────
  // CÓDIGO DEL CUADERNILLO
  // ─────────────────────────────────────────────

  const codeMatch =
    textoCompleto.match(
      /[A-Z]\d{2}-[A-Z]+-\d{2}/i
    );

  const codigo = safeText(
    ex.codigo_cuadernillo,
    codeMatch
      ? codeMatch[0].toUpperCase()
      : 'CUADERNILLO'
  );

  // ─────────────────────────────────────────────
  // TIPO DE PROCESO
  // ─────────────────────────────────────────────

  const variant = detectVariant(
    textoCompleto,
    codigo,
    (ex as any).tipo
  );

  const config =
    VARIANT_CONFIG[variant];

  // ─────────────────────────────────────────────
  // TÍTULO LIMPIO
  // ─────────────────────────────────────────────

  const tituloLimpioRaw =
    tituloRaw
      .replace(/\b(20\d{2})\b/g, '')
      .replace(
        /[A-Z]\d{2}-[A-Z]+-\d{2}/gi,
        ''
      )
      .replace(/[-–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const tituloLimpio = safeText(
    tituloLimpioRaw,
    'Evaluación Oficial'
  );

  // ─────────────────────────────────────────────
  // NIVEL
  // ─────────────────────────────────────────────

  const nivel = safeText(
    ex.nivel,
    'Primaria'
  );

  // ─────────────────────────────────────────────
  // ÁREA / ESPECIALIDAD
  // ─────────────────────────────────────────────

  const area = safeText(
    (ex as any).area,
    detectEspecialidad(textoCompleto) ?? nivel
  );

  // ─────────────────────────────────────────────
  // DURACIÓN
  // ─────────────────────────────────────────────

  const duracionRaw =
    (ex as any).duracion_minutos;

  const duracion =
    typeof duracionRaw === 'number' &&
    duracionRaw > 0
      ? duracionRaw
      : 180;

  // ─────────────────────────────────────────────
  // RESULTADO FINAL
  // ─────────────────────────────────────────────

  return {
    id: ex.id,
    tituloLimpio,
    anio,
    codigo,
    variant,
    nivel,
    area,
    duracion,
    tipoProceso: config.tipoProceso,
  };
};