'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Rocket,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  Lightbulb,
  LayoutGrid,
  Award,
  Clock,
  Target,
  CircleDot,
  BarChart3,
  BookOpen,
  Pause,
  Flag,
  Send,
} from 'lucide-react';

// ===========================================================================
// 1. DATOS ESTÁTICOS Y CONFIGURACIÓN (DETERMINISTAS)
// ===========================================================================
// Todas las cifras de este archivo se derivan de una sola fuente
// (DIAGNOSTIC_DATA) para que el mapa de preguntas, el diagnóstico y las
// tarjetas flotantes nunca queden desincronizados entre sí.
//
// Nota importante: los números de ESTE examen de ejemplo (75 preguntas,
// 6 competencias) son los de un simulacro concreto, no una regla general.
// Bond ofrece exámenes de distinta longitud (60, 75, 90 preguntas) y con
// distintas competencias según la convocatoria — por eso la sección de
// estadísticas de venta (más abajo) NO repite estos números como si fueran
// fijos para todo el producto.

// El mismo examen se muestra en los 3 modos (Simulacro → Práctica →
// Diagnóstico) para contar una sola historia coherente de principio a fin.
const EXAM_TITLE = 'Nombramiento Docente 2024 · EBR Primaria (C02-EBRP-22)';

// Alturas fijas y "diseñadas" para el ecualizador de audio.
// Nunca usar Math.random() en el render: en SSR y en la primera pintura
// del cliente generarían números distintos y React lanza un error de
// hidratación (el HTML no coincide).
const AUDIO_BARS = [45, 70, 32, 85, 55, 95, 40, 65] as const;

// --- ROTACIÓN AUTOMÁTICA DE PESTAÑAS ---
// El showcase alterna solo entre Simulacro → Práctica → Diagnóstico para
// que un visitante que no sabe que son botones clicables igual vea los 3
// modos. Un clic manual pausa la rotación un rato (no pelea con el
// usuario) y una barra de progreso bajo cada pestaña deja claro que son
// interactivas y que el tiempo avanza.
//
// IMPORTANTE — robustez: el temporizador usa timestamps reales
// (Date.now) en vez de solo contar "ticks" de setInterval. Esto evita el
// bug donde, si el navegador limita el timer en segundo plano (pestaña
// minimizada, cambio de ventana, hot-reload en dev) y luego el usuario
// vuelve, el intervalo "recupera" de golpe varios ticks perdidos y salta
// 2 o 3 pestañas de una sola vez — lo que se percibía como que el orden
// de los botones se alteraba o se "desincronizaba".
const AUTO_ROTATE_MS = 5000; // tiempo que cada pestaña permanece activa
const RESUME_AFTER_MANUAL_MS = 9000; // pausa tras un clic manual
const PROGRESS_TICK_MS = 50; // resolución de la barra de progreso

// --- DIAGNÓSTICO SMART (fuente única de verdad para este examen) ---
// Ordenado de menor a mayor dominio: el primer elemento es siempre la
// competencia más débil, y la recomendación final la referencia sola.
const DIAGNOSTIC_DATA = [
  { label: 'Razonamiento Lógico', correct: 2, total: 15 },
  { label: 'Personal Social', correct: 4, total: 12 },
  { label: 'Comunicación', correct: 5, total: 13 },
  { label: 'Comprensión Lectora', correct: 4, total: 10 },
  { label: 'Matemática', correct: 5, total: 12 },
  { label: 'Ciencia y Tecnología', correct: 7, total: 13 },
].map((d) => ({ ...d, percentage: Math.round((d.correct / d.total) * 100) }));

const TOTAL_QUESTIONS = DIAGNOSTIC_DATA.reduce((sum, d) => sum + d.total, 0); // 75
const TOTAL_CORRECT = DIAGNOSTIC_DATA.reduce((sum, d) => sum + d.correct, 0); // 27
const TOTAL_INCORRECT = TOTAL_QUESTIONS - TOTAL_CORRECT; // 48 (0 omitidas)
const TOTAL_OMITTED = 0;
// El puntaje final pondera cada competencia según su peso real en la
// Prueba Nacional, por eso no es un simple % de aciertos.
const EXAM_SCORE = 54;
const EXAM_TIME = '33m';

// Estadísticas de venta: solo afirmaciones que son ciertas para CUALQUIER
// examen de Bond, no solo para el de ejemplo de arriba.
const HERO_STATS = [
  { value: '100%', label: 'Simulacro cronometrado como el examen real' },
  { value: '+1,500', label: 'Preguntas con clave oficial MINEDU' },
  { value: '4.8/5', label: 'Calificación de docentes activos' },
] as const;


// --- MAPA DE PREGUNTAS DEL MODO PRÁCTICA (75 preguntas del simulacro) ---
type QuestionState = 'correct' | 'incorrect';

// IDs de las preguntas correctas, repartidas de forma natural en el
// examen. El resto son incorrectas — no hay omitidas, igual que en el
// reporte real. Solo se muestran las primeras filas de la cuadrícula para
// que la vista previa no crezca sin límite; el resto se resume en un chip.
const CORRECT_QUESTION_IDS = [
  3, 4, 7, 9, 12, 13, 17, 18, 21, 24, 27, 29,
];
const PRACTICE_DISPLAY_COUNT = 30;
const PRACTICE_REMAINING = TOTAL_QUESTIONS - PRACTICE_DISPLAY_COUNT;

const generatePracticeMap = (): { id: number; state: QuestionState }[] => {
  const correctSet = new Set(CORRECT_QUESTION_IDS);
  const map: { id: number; state: QuestionState }[] = [];
  for (let i = 1; i <= PRACTICE_DISPLAY_COUNT; i++) {
    map.push({ id: i, state: correctSet.has(i) ? 'correct' : 'incorrect' });
  }
  return map;
};

const PRACTICE_MAP = generatePracticeMap();

// --- MAPA DEL EXAMEN DEL MODO SIMULACRO (recién empezado: nada respondido) ---
type ExamCellState = 'respondida' | 'marcada' | 'actual' | 'pendiente';

const EXAM_TIME_REMAINING = '03:44:52';
const EXAM_CURRENT_ID = 1;
const EXAM_MARKED_ID = 12;
const EXAM_ANSWERED = 0;
const EXAM_DISPLAY_COUNT = 30;
const EXAM_REMAINING = TOTAL_QUESTIONS - EXAM_DISPLAY_COUNT;

const EXAM_PREVIEW_CELLS: { id: number; state: ExamCellState }[] = Array.from(
  { length: EXAM_DISPLAY_COUNT },
  (_, i) => {
    const id = i + 1;
    let state: ExamCellState = 'pendiente';
    if (id === EXAM_CURRENT_ID) state = 'actual';
    else if (id === EXAM_MARKED_ID) state = 'marcada';
    return { id, state };
  }
);

// --- MATEMÁTICA DEL RADAR CHART (generalizada para N ejes) ---
const RADAR_CENTER = 50;
const RADAR_RADIUS = 30;

const RADAR_ANGLES = DIAGNOSTIC_DATA.map(
  (_, i) => (Math.PI * 2 * i) / DIAGNOSTIC_DATA.length - Math.PI / 2
);

function radarPoint(angle: number, scale: number) {
  return {
    x: Number((RADAR_CENTER + RADAR_RADIUS * scale * Math.cos(angle)).toFixed(2)),
    y: Number((RADAR_CENTER + RADAR_RADIUS * scale * Math.sin(angle)).toFixed(2)),
  };
}

const toPointsAttr = (points: { x: number; y: number }[]) =>
  points.map((p) => `${p.x},${p.y}`).join(' ');

const RADAR_GRID_RINGS = [1, 0.75, 0.5, 0.25].map((scale) =>
  toPointsAttr(RADAR_ANGLES.map((angle) => radarPoint(angle, scale)))
);

const RADAR_AXES = RADAR_ANGLES.map((angle) => radarPoint(angle, 1));
const RADAR_DATA_POLYGON = RADAR_ANGLES.map((angle, i) =>
  radarPoint(angle, DIAGNOSTIC_DATA[i].percentage / 100)
);
const RADAR_DATA_POINTS_ATTR = toPointsAttr(RADAR_DATA_POLYGON);

// Posición y alineación de las etiquetas de cada eje, calculada a partir
// del ángulo — funciona para cualquier número de competencias sin tener
// que codificar cada coordenada a mano.
const RADAR_LABEL_POINTS = RADAR_ANGLES.map((angle) => radarPoint(angle, 1.4));
const RADAR_LABEL_ANCHORS = RADAR_ANGLES.map((angle) => {
  const cos = Math.cos(angle);
  if (cos > 0.35) return 'start' as const;
  if (cos < -0.35) return 'end' as const;
  return 'middle' as const;
});

// ===========================================================================
// 2. SUB-COMPONENTES DE LA UI
// ===========================================================================

/**
 * VISTA 1: SIMULACRO — el examen cronometrado, en condiciones reales
 * (sin retroalimentación inmediata, igual que la Prueba Nacional).
 */
const TimedExamView = () => (
  <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full w-full text-left">
    <div className="flex-1 flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.12)] sm:shadow-[0_20px_45px_-15px_rgba(15,23,42,0.18)] overflow-hidden">
      {/* Header con el nombre del examen */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
        <div className="flex items-center gap-1 text-slate-300 text-[11px] font-bold shrink-0">
          <ArrowLeft size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Salir</span>
        </div>
        <p className="text-[12px] sm:text-sm font-black text-slate-900 truncate">{EXAM_TITLE}</p>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 bg-slate-900 text-white text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-full">
          <Clock size={13} aria-hidden="true" />
          {EXAM_TIME_REMAINING}
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full">
          <Pause size={13} aria-hidden="true" /> Pausar
        </div>
        <div
          aria-hidden="true"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
        >
          <Volume2 size={15} />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full ml-auto">
          <Flag size={13} aria-hidden="true" /> Marcar
        </div>
      </div>

      {/* Pregunta (aún sin responder: opciones neutras, sin colores) */}
      <div className="px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between mb-4 gap-2">
          <span className="bg-blue-50 text-blue-700 text-[11px] sm:text-xs font-black px-3 sm:px-4 py-1.5 rounded-full">
            Pregunta {EXAM_CURRENT_ID} de {TOTAL_QUESTIONS}
          </span>
          <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-full">
            <CheckCircle2 size={14} aria-hidden="true" />
            {EXAM_ANSWERED}/{TOTAL_QUESTIONS}
          </span>
        </div>

        <p className="text-[14px] sm:text-[15px] text-slate-600 leading-relaxed">
          Por el día de Navidad, Delia lleva regalos —entre rompecabezas,
          peluches y pelotas— a los niños de su vecindario y decide
          entregarlos siempre en el mismo orden: rompecabezas, peluche,
          pelota, y así sucesivamente.
        </p>
        <p className="text-[15px] sm:text-base font-black text-slate-900 mt-3 leading-relaxed">
          Si ya van 19 niños formando la fila, ¿en qué posición se debe ubicar
          un niño que quiere recibir una pelota como regalo?
        </p>

        <div className="space-y-3 mt-5">
          {['En la posición 22.', 'En la posición 21.', 'En la posición 20.'].map((text, i) => (
            <div
              key={text}
              className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border-2 border-slate-100"
            >
              <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-black">
                {String.fromCharCode(65 + i)}
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-700">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navegación */}
      <div className="mt-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-300 text-xs sm:text-sm font-black">
          <ArrowLeft size={16} aria-hidden="true" /> Anterior
        </div>
        <div className="flex items-center gap-1.5 bg-blue-600 text-white text-xs sm:text-sm font-black px-5 py-2.5 rounded-xl">
          Siguiente <ArrowRight size={16} aria-hidden="true" />
        </div>
      </div>
    </div>

    {/* MAPA DEL EXAMEN (SIDEBAR) */}
    <div className="w-full lg:w-[280px] xl:w-[300px] bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.12)] sm:shadow-[0_20px_45px_-15px_rgba(15,23,42,0.18)] flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="text-blue-600" size={20} aria-hidden="true" />
          <h3 className="text-base sm:text-lg font-black text-slate-900">Mapa del examen</h3>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 text-[10px] sm:text-[11px] font-bold text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" aria-hidden="true" /> Respondida
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" aria-hidden="true" /> Marcada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-500" aria-hidden="true" /> Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-slate-300" aria-hidden="true" /> Pendiente
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
          {EXAM_PREVIEW_CELLS.map((cell) => (
            <div
              key={cell.id}
              className={`flex items-center justify-center h-8 sm:h-9 rounded-lg text-[11px] sm:text-xs font-black
                ${cell.state === 'actual' ? 'ring-2 ring-blue-500 text-blue-700 bg-blue-50' : ''}
                ${cell.state === 'marcada' ? 'bg-amber-100 text-amber-700 border border-amber-300' : ''}
                ${cell.state === 'respondida' ? 'bg-emerald-500 text-white' : ''}
                ${cell.state === 'pendiente' ? 'bg-white border border-slate-200 text-slate-400' : ''}
              `}
            >
              {cell.id}
            </div>
          ))}
          <div className="flex items-center justify-center h-8 sm:h-9 rounded-lg text-[10px] sm:text-[11px] font-bold text-slate-400 border border-dashed border-slate-200">
            +{EXAM_REMAINING}
          </div>
        </div>
      </div>

      <div className="mt-auto p-4 sm:p-6 pt-0">
        <div className="flex items-center justify-center gap-2 bg-slate-900 text-white text-xs sm:text-sm font-black px-4 py-3 rounded-2xl">
          <Send size={15} aria-hidden="true" /> Terminar y evaluar
        </div>
      </div>
    </div>
  </div>
);

/**
 * VISTA 2: PRÁCTICA — misma pregunta, pero con retroalimentación
 * inmediata y sustento pedagógico (aprender mientras se practica).
 */
const PracticeView = ({
  isPlayingAudio,
  onToggleAudio,
}: {
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
}) => (
  <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 h-full w-full text-left">
    {/* ÁREA DE LA PREGUNTA */}
    <div className="flex-1 flex flex-col bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.12)] sm:shadow-[0_20px_45px_-15px_rgba(15,23,42,0.18)] overflow-hidden relative">
      {/* Header Superior */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
        <div className="bg-blue-50 text-blue-700 text-[11px] sm:text-xs font-black px-3 sm:px-4 py-1.5 rounded-full">
          Pregunta 24 de {TOTAL_QUESTIONS}
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-full">
          <CheckCircle2 size={14} aria-hidden="true" />
          <span>
            {TOTAL_CORRECT}/{TOTAL_QUESTIONS}
          </span>
        </div>
      </div>

      {/* Sub-Header Estado */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="bg-slate-100 text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md">
          Razonamiento Lógico
        </span>
        <div className="flex items-center gap-1.5 text-rose-500 text-[11px] sm:text-xs font-black">
          <span className="text-rose-500">✕</span>
          <span>Marcaste A · La correcta era B</span>
        </div>
      </div>

      {/* Texto del caso + pregunta + audio-lectura */}
      <div className="px-4 sm:px-6 py-4 relative">
        <button
          type="button"
          onClick={onToggleAudio}
          aria-pressed={isPlayingAudio}
          aria-label="Escuchar la pregunta en audio-lectura"
          className={`absolute right-4 sm:right-6 top-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isPlayingAudio
              ? 'bg-blue-600 text-white scale-105 shadow-blue-300'
              : 'bg-slate-900 text-white hover:scale-105'
          }`}
        >
          <Volume2 size={18} className={isPlayingAudio ? 'animate-pulse' : ''} />
        </button>

        {/* Texto del caso — visible siempre, sin depender de un clic, para
            que en móvil se entienda de inmediato qué resuelve el simulador. */}
        <div className="pr-14 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={14} className="text-indigo-500 shrink-0" aria-hidden="true" />
            <span className="text-[10px] sm:text-[11px] font-black text-indigo-600 uppercase tracking-widest">
              Texto del caso
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed bg-indigo-50/50 border-l-4 border-indigo-300 rounded-r-2xl pl-4 pr-4 py-3">
            Un profesor forma una fila con sus 19 estudiantes y reparte
            premios siguiendo siempre el mismo patrón: cuaderno, lápiz,
            borrador — y vuelve a empezar.
          </p>
        </div>

        <p className="text-[16px] sm:text-[17px] font-black text-slate-900 leading-relaxed pr-14">
          ¿En qué posición está el estudiante que recibe un borrador?
        </p>

        {isPlayingAudio && (
          <div className="flex gap-1 items-end h-4 mt-3" aria-hidden="true">
            {AUDIO_BARS.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-blue-400 rounded-full animate-music-bar"
                style={{ height: `${height}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Opciones */}
      <div className="px-4 sm:px-6 pb-6 space-y-3 sm:space-y-4">
        {/* Opción A (Incorrecta) */}
        <div className="relative flex flex-col p-4 rounded-2xl border-2 border-rose-500 bg-rose-50/30">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm font-black">
                A
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Opción A</span>
                <span className="text-[9px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  Tu respuesta
                </span>
              </div>
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 pl-11">Posición 22.</p>
        </div>

        {/* Opción B (Correcta) */}
        <div className="relative flex flex-col p-4 rounded-2xl border-2 border-emerald-500 bg-white shadow-[0_4px_20px_-4px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black">
                B
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Opción B</span>
                <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  Respuesta correcta
                </span>
              </div>
            </div>
            <CheckCircle2 className="text-emerald-500 shrink-0" size={20} aria-hidden="true" />
          </div>
          <p className="text-base font-black text-slate-900 pl-11">Posición 21.</p>
        </div>

        {/* Opción C (Neutra) */}
        <div className="relative flex flex-col p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-black">
              C
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opción C</span>
          </div>
          <p className="text-base font-medium text-slate-400 pl-11">Posición 20.</p>
        </div>
      </div>

      {/* Sustento Pedagógico (simplificado) */}
      <div className="mx-4 sm:mx-6 mb-6 p-4 sm:p-5 rounded-2xl bg-[#FFFAEB] border border-amber-200/50 relative overflow-hidden">
        <Lightbulb className="absolute right-0 bottom-0 text-amber-100 opacity-50 translate-x-4 translate-y-4" size={90} aria-hidden="true" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="text-amber-500 fill-amber-500" size={18} aria-hidden="true" />
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">Sustento pedagógico</h4>
          </div>
          <p className="text-sm text-amber-900/80 leading-relaxed font-medium">
            El patrón se repite cada 3 posiciones: cuaderno, lápiz, borrador.
            Los borradores caen siempre en múltiplos de 3 (3, 6, 9…). Entre
            las opciones, solo <strong>21</strong> es múltiplo de 3 — por eso
            la respuesta correcta es <strong>B</strong>.
          </p>
        </div>
      </div>
    </div>

    {/* MAPA DE PREGUNTAS (SIDEBAR) */}
    <div className="w-full lg:w-[280px] xl:w-[300px] bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.12)] sm:shadow-[0_20px_45px_-15px_rgba(15,23,42,0.18)] flex flex-col shrink-0 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <LayoutGrid className="text-blue-600" size={20} aria-hidden="true" />
          <h3 className="text-base sm:text-lg font-black text-slate-900">Mapa de preguntas</h3>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5">
          <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-2xl py-2.5 sm:py-3 border border-emerald-100/50">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 leading-none mb-1">{TOTAL_CORRECT}</span>
            <span className="text-[7px] sm:text-[8px] font-black text-emerald-700 uppercase tracking-widest">Correctas</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-rose-50 rounded-2xl py-2.5 sm:py-3 border border-rose-100/50">
            <span className="text-xl sm:text-2xl font-black text-rose-500 leading-none mb-1">{TOTAL_INCORRECT}</span>
            <span className="text-[7px] sm:text-[8px] font-black text-rose-600 uppercase tracking-widest">Incorrectas</span>
          </div>
          <div className="flex flex-col items-center justify-center bg-[#FFF8EB] rounded-2xl py-2.5 sm:py-3 border border-amber-100/50">
            <span className="text-xl sm:text-2xl font-black text-amber-600 leading-none mb-1">{TOTAL_OMITTED}</span>
            <span className="text-[7px] sm:text-[8px] font-black text-amber-700 uppercase tracking-widest">Omitidas</span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
          {PRACTICE_MAP.map((q) => (
            <div
              key={q.id}
              className={`flex items-center justify-center h-8 sm:h-9 rounded-lg text-[11px] sm:text-xs font-black
                ${q.state === 'correct' ? 'bg-emerald-500 text-white' : ''}
                ${q.state === 'incorrect' ? 'bg-rose-500 text-white' : ''}
              `}
            >
              {q.id}
            </div>
          ))}
          <div className="flex items-center justify-center h-8 sm:h-9 rounded-lg text-[10px] sm:text-[11px] font-bold text-slate-400 border border-dashed border-slate-200">
            +{PRACTICE_REMAINING}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * VISTA 3: DIAGNÓSTICO — el análisis final, cuando el examen ya terminó.
 */
const DiagnosticDashboardView = () => (
  <div className="flex flex-col gap-4 sm:gap-6 h-full w-full text-left">
    {/* TARJETAS SUPERIORES */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white p-4 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Award className="text-blue-500" size={18} aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">Puntaje</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-[2.5rem] font-black text-slate-900 leading-none tracking-tighter">{EXAM_SCORE}</span>
          <span className="text-sm font-bold text-slate-400">/ 100</span>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Target className="text-emerald-500" size={18} aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">Aciertos</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-[2.5rem] font-black text-emerald-500 leading-none tracking-tighter">{TOTAL_CORRECT}</span>
          <span className="text-sm font-bold text-slate-400">/ {TOTAL_QUESTIONS}</span>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <span className="text-rose-500 text-lg leading-none" aria-hidden="true">✕</span>
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">Incorrectas</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-[2.5rem] font-black text-rose-500 leading-none tracking-tighter">{TOTAL_INCORRECT}</span>
        </div>
      </div>
      <div className="bg-white p-4 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          <Clock className="text-amber-500" size={18} aria-hidden="true" />
          <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">Tiempo</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-[2.5rem] font-black text-slate-900 leading-none tracking-tighter">{EXAM_TIME}</span>
        </div>
      </div>
    </div>

    {/* SECCIÓN INFERIOR */}
    <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1">
      {/* Radar Chart */}
      <div className="w-full lg:w-1/2 bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.12)] sm:shadow-[0_20px_45px_-15px_rgba(15,23,42,0.18)] p-5 sm:p-8 flex flex-col">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">Dominio de capacidades</h3>
        <p className="text-[10px] sm:text-[11px] font-black text-blue-600 uppercase tracking-widest mb-6 sm:mb-10">
          Análisis por componentes temáticos
        </p>

        <div className="relative w-full aspect-square max-w-[320px] mx-auto flex-1 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            {RADAR_GRID_RINGS.map((points, i) => (
              <polygon key={`grid-${i}`} points={points} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            ))}
            {RADAR_AXES.map((point, i) => (
              <line key={`axis-${i}`} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={point.x} y2={point.y} stroke="#e2e8f0" strokeWidth="0.5" />
            ))}
            <polygon
              points={RADAR_DATA_POINTS_ATTR}
              fill="rgba(37,99,235,0.08)"
              stroke="#2563eb"
              strokeWidth="1.5"
              strokeLinejoin="round"
              className="animate-radar-grow origin-center"
            />

            <g className="text-[4px] font-black fill-slate-700 select-none">
              {DIAGNOSTIC_DATA.map((item, i) => {
                const point = RADAR_LABEL_POINTS[i];
                const anchor = RADAR_LABEL_ANCHORS[i];
                return (
                  <g key={item.label}>
                    <text x={point.x} y={point.y} textAnchor={anchor}>
                      {item.label}
                    </text>
                    <text x={point.x} y={point.y + 5} textAnchor={anchor} fill="#2563eb" className="text-[4.5px]">
                      {item.percentage}%
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Lista de Diagnóstico */}
      <div className="w-full lg:w-1/2 bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-[0_8px_24px_-10px_rgba(15,23,42,0.12)] sm:shadow-[0_20px_45px_-15px_rgba(15,23,42,0.18)] p-5 sm:p-8 flex flex-col justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-4 sm:mb-6">Diagnóstico Smart</h3>

          <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
            {DIAGNOSTIC_DATA.map((item, index) => (
              <div
                key={index}
                className="bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-100 flex justify-between items-center"
              >
                <div>
                  <h4 className="text-[14px] sm:text-[15px] font-bold text-slate-800">{item.label}</h4>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {item.correct} de {item.total} aciertos
                  </p>
                </div>
                <span className="text-base sm:text-lg font-black text-rose-600">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#F4F8FF] border border-blue-100/80 rounded-2xl p-4 sm:p-5">
          <p className="text-[13px] sm:text-[14px] text-blue-900 leading-snug">
            <strong className="font-black uppercase tracking-wider text-blue-700 mr-2">Recomendación:</strong>
            Identificamos temas para reforzar. Empieza por{' '}
            <span className="font-medium">{DIAGNOSTIC_DATA[0].label}</span>.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ===========================================================================
// 3. COMPONENTE PRINCIPAL
// ===========================================================================

type Tab = 'simulacro' | 'practica' | 'diagnostico';

const TABS: { id: Tab; label: string; icon: typeof Target }[] = [
  { id: 'simulacro', label: 'Simulacro', icon: Clock },
  { id: 'practica', label: 'Práctica', icon: CircleDot },
  { id: 'diagnostico', label: 'Diagnóstico', icon: Target },
];

export const Hero = () => {
  const [activeTab, setActiveTab] = useState<Tab>('simulacro');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // --- Estado de la rotación automática ---
  // `progress` (0-100) alimenta la barra bajo la pestaña activa; al llegar
  // a 100 se avanza a la siguiente pestaña y se reinicia.
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotionRef = useRef(false);
  // Marca de tiempo real del último tick — permite calcular el tiempo
  // transcurrido de verdad en vez de asumir que cada tick duró
  // exactamente PROGRESS_TICK_MS (falso en segundo plano / hot-reload).
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  }, []);

  // Avanza a la siguiente pestaña (cíclico) y reinicia el progreso.
  const goToNextTab = () => {
    setActiveTab((current) => {
      const currentIndex = TABS.findIndex((t) => t.id === current);
      const nextIndex = (currentIndex + 1) % TABS.length;
      return TABS[nextIndex].id;
    });
    setProgress(0);
  };

  // Tick del progreso: avanza mientras no esté pausado (hover, pestaña del
  // navegador oculta, clic manual reciente, o preferencia de movimiento
  // reducido). Usa el tiempo real transcurrido (Date.now) en vez de contar
  // ticks para no "saltar" varias pestañas de golpe si el navegador retrasó
  // el temporizador mientras la ventana estaba en segundo plano.
  useEffect(() => {
    if (isPaused || prefersReducedMotionRef.current) return;

    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTickRef.current;
      lastTickRef.current = now;

      // Si el navegador "congeló" el timer (pestaña oculta, laptop en
      // suspensión, hot-reload) y de golpe pasó mucho más tiempo del
      // esperado, no intentamos recuperar el avance perdido: como mucho
      // avanzamos UNA pestaña y arrancamos limpio, para que nunca se
      // perciba un salto de varias pestañas a la vez.
      const cappedElapsedMs = Math.min(elapsedMs, AUTO_ROTATE_MS);
      const stepPct = (cappedElapsedMs / AUTO_ROTATE_MS) * 100;

      setProgress((prev) => {
        const next = prev + stepPct;
        if (next >= 100) {
          goToNextTab();
          return 0;
        }
        return next;
      });
    }, PROGRESS_TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  // Si la pestaña del navegador se oculta (cambio de app, minimizar) se
  // pausa de inmediato; al volver, se reinicia el progreso desde 0 en vez
  // de "continuar" con un cálculo basado en tiempo posiblemente impreciso.
  // Esto es lo que evita el bug de "se desincroniza" al volver a la página.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setProgress(0);
        lastTickRef.current = Date.now();
        setIsPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Selección manual: salta a la pestaña elegida y pausa la rotación un
  // rato para no competir con lo que el usuario quiere mirar.
  const handleSelectTab = (tabId: Tab) => {
    setActiveTab(tabId);
    setProgress(0);
    setIsPaused(true);

    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      resumeTimeoutRef.current = null;
      setIsPaused(false);
    }, RESUME_AFTER_MANUAL_MS);
  };

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  const handleToggleAudio = () => {
    setIsPlayingAudio((prev) => !prev);
  };

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative pt-20 pb-24 sm:pt-24 sm:pb-32 lg:pt-32 lg:pb-40 overflow-hidden bg-white"
    >
      {/* --- FONDO DECORATIVO --- */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/4 w-72 h-72 sm:w-96 sm:h-96 bg-blue-50 rounded-full blur-[100px] sm:blur-[120px] opacity-60 animate-pulse-slow"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-1/4 w-[380px] h-[380px] sm:w-[500px] sm:h-[500px] bg-emerald-50 rounded-full blur-[110px] sm:blur-[140px] opacity-40"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"
      />

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/*
          CLAVE DEL FIX: antes este contenedor usaba `items-center`. Las
          3 vistas del showcase (derecha) no miden exactamente lo mismo
          de alto, así que cada vez que la pestaña cambiaba (sola o por
          clic), la fila entera se re-centraba verticalmente y la columna
          izquierda "saltaba" de posición — eso es lo que se veía como
          desincronización. Con `items-start` en xl+, la columna izquierda
          queda anclada arriba y ya no se mueve pase lo que pase a la
          derecha. En mobile/tablet (columna apilada) se mantiene
          centrado, que es lo que se ve mejor ahí.
        */}
        <div className="flex flex-col items-center xl:flex-row xl:items-start gap-10 sm:gap-12 xl:gap-16">
          {/* ========================================= */}
          {/* 1. COLUMNA IZQUIERDA */}
          {/* ========================================= */}
          <div className="w-full xl:w-[45%] xl:pt-6 text-center xl:text-left space-y-8 sm:space-y-10">
            <div className="inline-flex items-center gap-2 bg-slate-900 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.25em] shadow-2xl shadow-blue-200 animate-bounce-subtle">
              <Sparkles size={14} className="text-cyan-400" aria-hidden="true" />
              <span>Innovación Educativa 2026</span>
            </div>

            <h1
              id="hero-heading"
              className="text-4xl sm:text-6xl lg:text-[5rem] font-black text-slate-900 leading-[1.25] tracking-tight"
            >
              Tu éxito docente
              <br />
              <span className="relative inline-block mt-3 pb-3 pr-3 overflow-visible">
                {/* inline-block + tracking-normal + antialiased evitan que el
                    trazo curvo de letras itálicas (la "s" sobre todo) se vea
                    recortado por el degradado de bg-clip-text */}
                <span className="relative z-10 inline-block antialiased text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 italic tracking-normal pr-2">
                  no es casualidad.
                </span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 left-0 w-full h-3 sm:h-4 bg-blue-100/60 -z-0 rounded-full"
                />
              </span>
            </h1>

            <p className="text-lg sm:text-xl lg:text-2xl text-slate-500 leading-relaxed max-w-xl mx-auto xl:mx-0 font-medium">
              Domina la Prueba Nacional con{' '}
              <strong className="text-slate-700 font-bold">Audio-Lectura</strong>, simulacros de
              alta fidelidad y{' '}
              <strong className="text-slate-700 font-bold">Diagnóstico Smart</strong> por
              competencias.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center xl:justify-start">
              <Link
                href="/registro"
                className="group relative w-full sm:w-auto active:scale-95 transition-all duration-300 rounded-[2rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-50 transition duration-700"
                />
                <div className="relative w-full sm:w-auto bg-slate-900 text-white px-10 sm:px-12 py-5 sm:py-6 rounded-[1.8rem] text-lg sm:text-xl font-black flex items-center justify-center gap-3 sm:gap-4 overflow-hidden border border-white/20 shadow-[0_15px_30px_-10px_rgba(15,23,42,0.3)] sm:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.3)]">
                  <span className="relative z-10 tracking-tight">Empezar ahora</span>
                  <Rocket
                    size={20}
                    aria-hidden="true"
                    className="relative z-10 text-cyan-400 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-0 -inset-full h-full w-full z-[1] block transform -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-premium-shine pointer-events-none"
                  />
                </div>
              </Link>

              <Link
                href="/servicios"
                className="w-full sm:w-auto group flex items-center justify-center gap-3 px-8 sm:px-10 py-5 sm:py-6 rounded-[1.8rem] text-lg sm:text-xl font-black text-slate-700 hover:text-blue-600 border-2 border-slate-200 hover:border-blue-600 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
              >
                Ver metodología
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" aria-hidden="true" />
              </Link>
            </div>

            {/* Solo afirmaciones válidas para cualquier examen de Bond —
                nada de cifras fijas de preguntas o competencias, que varían
                según la convocatoria. */}
            <dl className="flex flex-wrap items-center justify-center xl:justify-start gap-6 sm:gap-8 lg:gap-12 pt-6 sm:pt-8">
              {HERO_STATS.map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <div aria-hidden="true" className="w-[1px] h-10 bg-slate-200 hidden sm:block" />}
                  <div className="space-y-1 text-center xl:text-left">
                    <dd className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</dd>
                    <dt className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      {stat.label}
                    </dt>
                  </div>
                </React.Fragment>
              ))}
            </dl>
          </div>

          {/* ========================================= */}
          {/* 2. COLUMNA DERECHA — SHOWCASE ALTERNABLE */}
          {/* ========================================= */}
          <div className="w-full xl:w-[55%] relative">
            {/* Sombra de contacto */}
            <div
              aria-hidden="true"
              className="absolute -bottom-8 left-6 right-6 sm:-bottom-10 sm:left-10 sm:right-10 h-16 sm:h-20 bg-slate-900/10 blur-[50px] sm:blur-[60px] rounded-[50%] -rotate-2"
            />

            <div
              className="relative bg-[#f8fafc] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)] sm:shadow-2xl p-2.5 sm:p-4 flex flex-col"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => {
                // Al salir del showcase, reanuda salvo que haya una pausa
                // manual todavía activa (el timeout la limpiará solo).
                if (!resumeTimeoutRef.current) setIsPaused(false);
              }}
            >
              {/* Pestañas: cada una es un botón real con su propia barra de
                  progreso — así se ve de inmediato que son clicables y que
                  el contenido avanza solo. En móvil ocupan todo el ancho en
                  partes iguales para que sean fáciles de tocar; en pantallas
                  grandes son píldoras centradas de ancho automático. */}
              <div
                role="tablist"
                aria-label="Vistas del simulador: Simulacro, Práctica y Diagnóstico"
                className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:justify-center sm:gap-2 mb-3 sm:mb-4 bg-white border border-slate-200 p-1.5 sm:p-2 rounded-2xl sm:mx-auto shadow-sm sm:w-max z-20"
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => handleSelectTab(tab.id)}
                      className={`relative overflow-hidden px-2 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={15} aria-hidden="true" className="shrink-0" />
                      <span>{tab.label}</span>

                      {/* Barra de progreso tipo "stories": solo visible en
                          la pestaña activa, muestra cuánto falta para el
                          cambio automático. */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 bottom-0 h-[3px] bg-white/70 rounded-full"
                          style={{
                            width: `${progress}%`,
                            transition: isPaused ? 'none' : `width ${PROGRESS_TICK_MS}ms linear`,
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Contenido de la pestaña activa. Se monta solo la vista
                  seleccionada. Las 3 vistas comparten el mismo min-height
                  fijo para que el contenedor no cambie de tamaño entre
                  pestañas — así la columna izquierda nunca se reacomoda. */}
              <div key={activeTab} className="flex-1 w-full min-h-[420px] sm:min-h-[560px] lg:min-h-[640px] animate-tab-fade-in">
                {activeTab === 'simulacro' && <TimedExamView />}
                {activeTab === 'practica' && (
                  <PracticeView isPlayingAudio={isPlayingAudio} onToggleAudio={handleToggleAudio} />
                )}
                {activeTab === 'diagnostico' && <DiagnosticDashboardView />}
              </div>
            </div>

            {/* Tarjetas flotantes — solo en pantallas grandes para no saturar móvil */}
            <div className="absolute -left-8 -bottom-6 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 hidden xl:flex items-center gap-3 animate-float-delayed z-20">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 size={18} aria-hidden="true" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                  Aciertos
                </p>
                <p className="text-sm font-black text-slate-800">
                  {TOTAL_CORRECT} / {TOTAL_QUESTIONS}
                </p>
              </div>
            </div>

            <div className="absolute -right-6 -top-6 bg-white px-5 py-3.5 rounded-3xl shadow-2xl border border-slate-100 hidden xl:flex items-center gap-3 animate-float z-30">
              <div className="p-2.5 bg-amber-100 text-amber-600 rounded-2xl">
                <Award size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">
                  Nivel actual
                </p>
                <p className="text-base font-black text-slate-800">Apto 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes premium-shine {
          0% {
            transform: translateX(-100%) skewX(-12deg);
          }
          25%,
          100% {
            transform: translateX(250%) skewX(-12deg);
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(0.5deg);
          }
        }
        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(15px) rotate(-0.5deg);
          }
        }
        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
        }
        @keyframes radarGrow {
          from {
            transform: scale(0.5);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes music-bar {
          0%,
          100% {
            transform: scaleY(0.4);
          }
          50% {
            transform: scaleY(1);
          }
        }
        @keyframes tabFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-premium-shine {
          animation: premium-shine 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-bounce-subtle {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite;
        }
        .animate-radar-grow {
          animation: radarGrow 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .animate-music-bar {
          animation: music-bar 1s ease-in-out infinite;
          transform-origin: bottom;
        }
        .animate-tab-fade-in {
          animation: tabFadeIn 0.35s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-premium-shine,
          .animate-pulse-slow,
          .animate-bounce-subtle,
          .animate-float,
          .animate-float-delayed,
          .animate-radar-grow,
          .animate-music-bar,
          .animate-tab-fade-in {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
};