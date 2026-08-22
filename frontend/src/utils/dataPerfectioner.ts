import { ExamenCompleto } from '@/types';
import { TrendingUp, UserPlus, GraduationCap, BookOpen, LucideIcon } from 'lucide-react';

export type ExamVariant = 'nombramiento' | 'ascenso' | 'cpm' | 'especialidad';

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

const safeText = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return fallback;
  }
  return trimmed;
};

const detectVariant = (texto: string): ExamVariant => {
  const t = texto.toLowerCase();
  if (t.includes('nombramiento')) return 'nombramiento';
  if (t.includes('ascenso')) return 'ascenso';
  if (t.includes('cpm') || t.includes('ingreso')) return 'cpm';
  return 'especialidad';
};

const ESPECIALIDAD_KEYWORDS: Array<[RegExp, string]> = [
  [/INNOVACI[ÓO]N PEDAG[ÓO]GICA/, 'Profesor de Innovación Pedagógica'],
  [/COMUNICACI[ÓO]N/, 'Comunicación'],
  [/MATEM[ÁA]TICA/, 'Matemática'],
  [/EDUCACI[ÓO]N F[ÍI]SICA/, 'Educación Física'],
  [/CIENCIAS? SOCIALES/, 'Ciencias Sociales'],
  [/PERSONAL SOCIAL/, 'Personal Social'],
  [/CIENCIA Y (TECNOLOG[ÍI]A|AMBIENTE)/, 'Ciencia y Tecnología'],
];

const detectEspecialidad = (texto: string): string | null => {
  const t = texto.toUpperCase();
  for (const [regex, label] of ESPECIALIDAD_KEYWORDS) {
    if (regex.test(t)) return label;
  }
  return null;
};

export const perfectExamenData = (ex: ExamenCompleto): PerfectExamenData => {
  const tituloRaw = ex.titulo || '';
  const descripcionRaw = (ex as any).descripcion || '';
  const textoCompleto = `${tituloRaw} ${descripcionRaw}`;

  const yearMatch = textoCompleto.match(/\b(20\d{2})\b/);
  const anioRaw = (ex as any).anio ? String((ex as any).anio) : '';
  const anio = safeText(anioRaw, yearMatch ? yearMatch[0] : '2024');

  const codeMatch = textoCompleto.match(/[A-Z]\d{2}-[A-Z]+-\d{2}/i);
  const codigo = safeText(ex.codigo_cuadernillo, codeMatch ? codeMatch[0].toUpperCase() : 'CUADERNILLO');

  const variant = detectVariant(textoCompleto);
  const config = VARIANT_CONFIG[variant];

  const tituloLimpioRaw = tituloRaw
    .replace(/\b(20\d{2})\b/g, '')
    .replace(/[A-Z]\d{2}-[A-Z]+-\d{2}/gi, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tituloLimpio = safeText(tituloLimpioRaw, 'Evaluación Oficial');

  const nivel = safeText(ex.nivel, 'Primaria');
  const area = safeText((ex as any).area, detectEspecialidad(textoCompleto) ?? nivel);

  const duracionRaw = (ex as any).duracion_minutos;
  const duracion = typeof duracionRaw === 'number' && duracionRaw > 0 ? duracionRaw : 180;

  return { id: ex.id, tituloLimpio, anio, codigo, variant, nivel, area, duracion, tipoProceso: config.tipoProceso };
};