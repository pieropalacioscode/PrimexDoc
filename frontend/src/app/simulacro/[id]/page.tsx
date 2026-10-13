"use client";

import React, { useEffect, useState, useRef, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';
import { abandonarIntento } from '@/services/historialService';
import { Opcion, ExamenDetalle } from '@/types';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Pause,
  Play,
  Flag,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  Send,
  Loader2,
  X,
  Lightbulb,
  Volume2,
  LogOut,
  Trash2,
  Sparkles,
  WifiOff,
  RotateCcw,
  ShieldCheck,
  History,
  Square,
} from 'lucide-react';
import { QuestionText, InlineText } from '../../../components/exam/QuestionText';

interface SimulacroPageProps {
  params: Promise<{ id: string }> | { id: string };
}

// ==========================================
// HELPERS PUROS (fuera del componente: no se recrean en cada render)
// ==========================================

function formatTiempo(segundosTotal: number): string {
  const horas = Math.floor(segundosTotal / 3600);
  const mins = Math.floor((segundosTotal % 3600) / 60);
  const segs = segundosTotal % 60;
  return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
}

// Clases del "pastillón" de tiempo restante en el header oscuro.
function claseReloj(segundos: number): string {
  if (segundos < 300) return 'bg-red-500/15 text-red-300 border-red-500/30 animate-pulse';
  if (segundos < 900) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-white/5 text-white border-white/10';
}

type EstadoBasePildora = 'respondida' | 'marcada' | 'pendiente';

function clasePildora(base: EstadoBasePildora, esActual: boolean): string {
  let clase =
    base === 'marcada'
      ? 'bg-amber-400 text-amber-950 border-transparent font-extrabold shadow-sm'
      : base === 'respondida'
      ? 'bg-emerald-500 text-white border-transparent font-bold shadow-sm'
      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 hover:border-slate-300';
  if (esActual) clase += ' ring-4 ring-blue-600/30 border-blue-600 !scale-110 z-10 font-black';
  return clase;
}

// ============================================================
// COLOR DINÁMICO POR COMPONENTE PEDAGÓGICO
// Mismo criterio de color que en Resultados: el estudiante asocia
// siempre el mismo color a un componente (RM, CTA, Comprensión
// Lectora...) durante práctica -> simulacro -> revisión.
// ============================================================
const PALETA_COMPONENTES = [
  { dot: 'bg-indigo-500', texto: 'text-indigo-700', fondo: 'bg-indigo-50', borde: 'border-indigo-200' },
  { dot: 'bg-fuchsia-500', texto: 'text-fuchsia-700', fondo: 'bg-fuchsia-50', borde: 'border-fuchsia-200' },
  { dot: 'bg-cyan-500', texto: 'text-cyan-700', fondo: 'bg-cyan-50', borde: 'border-cyan-200' },
  { dot: 'bg-orange-500', texto: 'text-orange-700', fondo: 'bg-orange-50', borde: 'border-orange-200' },
  { dot: 'bg-teal-500', texto: 'text-teal-700', fondo: 'bg-teal-50', borde: 'border-teal-200' },
  { dot: 'bg-pink-500', texto: 'text-pink-700', fondo: 'bg-pink-50', borde: 'border-pink-200' },
  { dot: 'bg-lime-600', texto: 'text-lime-700', fondo: 'bg-lime-50', borde: 'border-lime-200' },
  { dot: 'bg-violet-500', texto: 'text-violet-700', fondo: 'bg-violet-50', borde: 'border-violet-200' },
] as const;

function hashTextoSimple(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function colorDeComponente(nombre: string) {
  const indice = hashTextoSimple(nombre) % PALETA_COMPONENTES.length;
  return PALETA_COMPONENTES[indice];
}

function nombreComponenteExamen(p: { componente?: string | null }): string {
  const valor = p.componente?.trim();
  return valor && valor.length > 0 ? valor : 'Sin Categoría';
}

interface GrupoComponenteExamen {
  nombre: string;
  indices: number[];
  numeroInicio: number;
  numeroFin: number;
}

// Agrupa las preguntas en bloques CONTIGUOS por componente, respetando el
// orden real del examen. Guardamos ÍNDICES porque irAPregunta() y el
// resaltado de "pregunta actual" trabajan sobre el índice.
function agruparPreguntasExamenPorComponente(
  preguntas: { componente?: string | null }[]
): GrupoComponenteExamen[] {
  const grupos: GrupoComponenteExamen[] = [];

  preguntas.forEach((p, index) => {
    const nombre = nombreComponenteExamen(p);
    const numero = index + 1;
    const ultimo = grupos[grupos.length - 1];

    if (ultimo && ultimo.nombre === nombre) {
      ultimo.indices.push(index);
      ultimo.numeroFin = numero;
    } else {
      grupos.push({ nombre, indices: [index], numeroInicio: numero, numeroFin: numero });
    }
  });

  return grupos;
}

// El endpoint de entrenamiento a veces devuelve listas como Mapa/Objeto
// { "id": {...} } en vez de Array. Esta función normaliza ambos formatos.
function normalizarAArray<T = any>(valor: any): T[] {
  if (Array.isArray(valor)) return valor as T[];
  if (valor && typeof valor === 'object') {
    return Object.entries(valor)
      .sort(([a], [b]) => {
        const numA = Number(a);
        const numB = Number(b);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      })
      .map(([key, val]) => {
        if (val && typeof val === 'object' && !('id' in (val as any))) {
          return { id: key, ...(val as object) } as T;
        }
        return val as T;
      });
  }
  return [];
}

// ==========================================
// ADAPTER: respuesta cruda del backend -> ExamenDetalle canónico
// ==========================================
function adaptarExamen(data: any): ExamenDetalle {
  if (!data) return {} as ExamenDetalle;

  return {
    ...data,
    preguntas: normalizarAArray(data?.preguntas).map((p: any) => ({
      id: p.id,
      numero_pregunta: p.numero || p.numero_pregunta || 0,
      texto_pregunta: (p.texto_pregunta || p.texto || p.enunciado || '').trim(),
      url_imagen: p.url_imagen || p.imagen_url || null,
      explicacion: p.explicacion || '',
      texto_base_id: p.texto_base_id || null,

      // --- DATA ENRIQUECIDA MINEDU ---
      subprueba: (p.subprueba || 'Habilidades Generales').trim(),
      componente: (p.componente || 'Sin Categoría').trim(),

      opciones: normalizarAArray(p.opciones || p.alternativas).map((o: any) => ({
        id: o.id,
        etiqueta: o.etiqueta || o.letra || '',
        texto_opcion: (o.texto_opcion || o.texto || '').trim(),
        es_correcta: !!o.es_correcta,
      })),
    })),

    textos_base: normalizarAArray(data?.textos_base).map((tb: any) => ({
      ...tb,
      contenido: tb.contenido || tb.texto || '',
    })),
  } as ExamenDetalle;
}

// ============================================================
// AUDIO / LECTOR DE VOZ
// ------------------------------------------------------------
// ⚠️ POR QUÉ FALLABA ANTES (y qué cambió):
// 1. Chrome corta cualquier utterance de más de ~15 s. El enunciado +
//    las 4 alternativas supera ese límite, por eso "el botón del
//    enunciado no funcionaba" mientras el del caso corto sí. Ahora el
//    texto se parte en fragmentos y se encolan uno tras otro.
// 2. speechSynthesis.cancel() seguido de speak() en el mismo tick es
//    ignorado por Chrome. Ahora solo se usa el retardo cuando de verdad
//    hay algo sonando (y así no se pierde el gesto del usuario en iOS).
// 3. speechSynthesis.pause() no funciona en Chrome Android: si tras
//    pausar el motor sigue hablando, cortamos y guardamos el fragmento
//    para reanudar exactamente desde ahí.
// 4. getVoices() llega vacío en el primer render en móviles y no siempre
//    dispara 'voiceschanged': ahora hay reintentos escalonados.
// ============================================================

function limpiarTextoParaAudio(texto?: string | null): string {
  if (!texto) return '';
  return texto
    .replace(/<[^>]*>/g, ' ') // tags HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/[*_#>`~]/g, ' ') // símbolos de markdown
    .replace(/^\s*[-•]\s*/gm, '. ') // viñetas -> pausa
    .replace(/\s+/g, ' ')
    .trim();
}

// Parte el texto en fragmentos cortos por oración (y por espacios si una
// oración es larguísima). Cada fragmento se reproduce como un utterance.
function dividirEnFragmentos(texto: string, maximo = 170): string[] {
  const oraciones = texto.match(/[^.!?…]+[.!?…]*/g) || [texto];
  const fragmentos: string[] = [];
  let actual = '';

  const empujar = () => {
    const limpio = actual.trim();
    if (limpio) fragmentos.push(limpio);
    actual = '';
  };

  for (const bruta of oraciones) {
    const pieza = bruta.trim();
    if (!pieza) continue;

    if ((actual + ' ' + pieza).trim().length <= maximo) {
      actual = (actual + ' ' + pieza).trim();
      continue;
    }

    empujar();

    if (pieza.length <= maximo) {
      actual = pieza;
    } else {
      let resto = pieza;
      while (resto.length > maximo) {
        let corte = resto.lastIndexOf(' ', maximo);
        if (corte < maximo * 0.5) corte = maximo;
        fragmentos.push(resto.slice(0, corte).trim());
        resto = resto.slice(corte).trim();
      }
      actual = resto;
    }
  }

  empujar();
  return fragmentos.filter(Boolean);
}

// Voz en español más natural y cercana disponible en el dispositivo.
// Priorizamos motores neuronales y variantes latinoamericanas.
function elegirMejorVoz(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const esVoces = voces.filter((v) => v.lang?.toLowerCase().startsWith('es'));
  if (esVoces.length === 0) return undefined;

  const nombresPreferidos = [
    'google español de estados unidos',
    'google español',
    'microsoft camila',
    'microsoft dalia',
    'microsoft sabina',
    'microsoft helena',
    'microsoft paulina',
    'paulina',
    'camila',
    'mónica',
    'monica',
    'lucía',
    'lucia',
    'esperanza',
    'jorge',
    'pablo',
  ];

  for (const nombre of nombresPreferidos) {
    const encontrada = esVoces.find((v) => v.name.toLowerCase().includes(nombre));
    if (encontrada) return encontrada;
  }

  return (
    esVoces.find((v) => v.lang === 'es-PE') ||
    esVoces.find((v) => v.lang === 'es-419') ||
    esVoces.find((v) => v.lang === 'es-MX') ||
    esVoces.find((v) => v.lang === 'es-US') ||
    esVoces.find((v) => v.lang === 'es-ES') ||
    esVoces[0]
  );
}

type EstadoAudio = 'inactivo' | 'reproduciendo' | 'pausado';

interface LectorVoz {
  soportado: boolean;
  idActivo: string | null;
  pausado: boolean;
  hablar: (texto: string, id: string) => void;
  detener: () => void;
  estadoDe: (id: string) => EstadoAudio;
}

function useLectorVoz(): LectorVoz {
  const [idActivo, setIdActivo] = useState<string | null>(null);
  const [pausado, setPausado] = useState(false);
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);

  const idRef = useRef<string | null>(null);
  const pausadoRef = useRef(false);
  const colaRef = useRef<string[]>([]);
  const indiceRef = useRef(0);
  const cortadoRef = useRef(false);
  const vocesRef = useRef<SpeechSynthesisVoice[]>([]);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reproducirRef = useRef<() => void>(() => {});

  const soportado = typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined';

  vocesRef.current = voces;
  pausadoRef.current = pausado;

  // Carga de voces con reintentos (móviles no siempre disparan el evento)
  useEffect(() => {
    if (!soportado) return;
    const cargar = () => {
      const lista = window.speechSynthesis.getVoices();
      if (lista && lista.length) setVoces(lista);
    };
    cargar();
    window.speechSynthesis.addEventListener('voiceschanged', cargar);
    const reintentos = [250, 700, 1500, 3000].map((ms) => setTimeout(cargar, ms));
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', cargar);
      reintentos.forEach(clearTimeout);
    };
  }, [soportado]);

  const pararWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const finalizar = useCallback(() => {
    pararWatchdog();
    colaRef.current = [];
    indiceRef.current = 0;
    idRef.current = null;
    setIdActivo(null);
    setPausado(false);
  }, [pararWatchdog]);

  // Reproductor de la cola de fragmentos
  reproducirRef.current = () => {
    if (!soportado) return;
    const sintetizador = window.speechSynthesis;
    const fragmentos = colaRef.current;

    if (indiceRef.current >= fragmentos.length) {
      finalizar();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(fragmentos[indiceRef.current]);
    const voz = elegirMejorVoz(vocesRef.current);
    if (voz) {
      utterance.voice = voz;
      utterance.lang = voz.lang;
    } else {
      utterance.lang = 'es-PE';
    }
    utterance.rate = 0.95; // ritmo docente, claro y sin prisa
    utterance.pitch = 1.05; // un punto más cálido y cercano
    utterance.volume = 1;

    utterance.onend = () => {
      if (cortadoRef.current) return; // corte manual: no avanzamos
      indiceRef.current += 1;
      reproducirRef.current();
    };
    utterance.onerror = () => {
      if (cortadoRef.current) return;
      indiceRef.current += 1;
      reproducirRef.current();
    };

    sintetizador.speak(utterance);
  };

  // Chrome "duerme" el sintetizador en lecturas largas: lo despertamos.
  const iniciarWatchdog = useCallback(() => {
    pararWatchdog();
    watchdogRef.current = setInterval(() => {
      if (!soportado) return;
      if (!idRef.current) {
        pararWatchdog();
        return;
      }
      if (pausadoRef.current) return;
      const s = window.speechSynthesis;
      if (s.speaking && !s.paused) s.resume();
    }, 9000);
  }, [pararWatchdog, soportado]);

  const detener = useCallback(() => {
    if (!soportado) return;
    cortadoRef.current = true;
    window.speechSynthesis.cancel();
    finalizar();
  }, [finalizar, soportado]);

  const hablar = useCallback(
    (texto: string, id: string) => {
      if (!soportado) return;
      const sintetizador = window.speechSynthesis;

      // Mismo botón ya activo -> alterna pausa / reanudación
      if (idRef.current === id) {
        if (pausadoRef.current) {
          if (cortadoRef.current) {
            // Reanudamos re-hablando el fragmento donde nos quedamos
            cortadoRef.current = false;
            reproducirRef.current();
          } else {
            sintetizador.resume();
          }
          setPausado(false);
        } else {
          sintetizador.pause();
          setPausado(true);
          // Fallback Android: si pause() no surtió efecto, cortamos.
          setTimeout(() => {
            if (idRef.current === id && sintetizador.speaking && !sintetizador.paused) {
              cortadoRef.current = true;
              sintetizador.cancel();
            }
          }, 180);
        }
        return;
      }

      const limpio = limpiarTextoParaAudio(texto);
      if (!limpio) return;

      cortadoRef.current = false;
      colaRef.current = dividirEnFragmentos(limpio);
      indiceRef.current = 0;
      idRef.current = id;
      setIdActivo(id);
      setPausado(false);

      const arrancar = () => {
        if (idRef.current !== id) return;
        reproducirRef.current();
        iniciarWatchdog();
      };

      if (sintetizador.speaking || sintetizador.pending) {
        // Hay audio previo: cancelamos y esperamos un tick (bug de Chrome)
        sintetizador.cancel();
        setTimeout(arrancar, 140);
      } else {
        // Sin audio previo: arrancamos DENTRO del gesto del usuario (iOS)
        arrancar();
      }
    },
    [iniciarWatchdog, soportado]
  );

  useEffect(() => {
    return () => {
      if (soportado) window.speechSynthesis.cancel();
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, [soportado]);

  const estadoDe = useCallback(
    (id: string): EstadoAudio => {
      if (idActivo !== id) return 'inactivo';
      return pausado ? 'pausado' : 'reproduciendo';
    },
    [idActivo, pausado]
  );

  return { soportado, idActivo, pausado, hablar, detener, estadoDe };
}

// ==========================================
// UI: botón de audio único (escuchar / pausar / reanudar en el mismo sitio)
// ==========================================
function BotonAudio({
  estado,
  onClick,
  onDetener,
  disabled,
  className = '',
  size = 20,
  titulo = 'Escuchar',
  mostrarDetener = true,
}: {
  estado: EstadoAudio;
  onClick: (e: React.MouseEvent) => void;
  onDetener?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  size?: number;
  titulo?: string;
  mostrarDetener?: boolean;
}) {
  const Icono = estado === 'reproduciendo' ? Pause : estado === 'pausado' ? Play : Volume2;
  const etiqueta =
    estado === 'reproduciendo' ? 'Pausar audio' : estado === 'pausado' ? 'Reanudar audio' : titulo;

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={etiqueta}
        aria-label={etiqueta}
        className={`${className} ${estado === 'reproduciendo' ? 'scale-105' : ''}`}
      >
        <Icono size={size} fill={estado !== 'inactivo' ? 'currentColor' : 'none'} />
      </button>

      {mostrarDetener && estado !== 'inactivo' && onDetener && (
        <button
          type="button"
          onClick={onDetener}
          title="Detener audio"
          aria-label="Detener audio"
          className="p-1.5 rounded-lg bg-slate-900/5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Square size={size - 6} fill="currentColor" />
        </button>
      )}
    </span>
  );
}

// ==========================================
// UI: contenido del mapa de preguntas (se reutiliza en sidebar y en la
// hoja inferior del móvil, para que exista UNA sola fuente de verdad)
// ==========================================
function ContenidoMapa({
  preguntas,
  respuestas,
  preguntasMarcadas,
  preguntaActualIdx,
  irAPregunta,
  submitting,
  alturaLista,
}: {
  preguntas: any[];
  respuestas: Record<string, string>;
  preguntasMarcadas: Set<string>;
  preguntaActualIdx: number;
  irAPregunta: (i: number) => void;
  submitting: boolean;
  alturaLista: string;
}) {
  const grupos = agruparPreguntasExamenPorComponente(preguntas);

  return (
    <div className="space-y-4">
      {/* Leyenda */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs p-3 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-emerald-500 rounded-md shadow-sm" />
          <span className="text-slate-600 font-medium">Respondida</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-amber-400 rounded-md shadow-sm" />
          <span className="text-slate-600 font-medium">Marcada</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-white border-2 border-blue-600 rounded-md" />
          <span className="text-slate-600 font-medium">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-slate-100 border border-slate-300 rounded-md" />
          <span className="text-slate-600 font-medium">Pendiente</span>
        </div>
      </div>

      <div className={`${alturaLista} overflow-y-auto pr-1 pb-2 ds-scroll space-y-3`}>
        {grupos.map((grupo, grupoIdx) => {
          const color = colorDeComponente(grupo.nombre);
          const rango =
            grupo.numeroInicio === grupo.numeroFin
              ? `Pregunta ${grupo.numeroInicio}`
              : `Preguntas ${grupo.numeroInicio}–${grupo.numeroFin}`;

          return (
            <div
              key={`${grupo.nombre}-${grupoIdx}`}
              className={`rounded-2xl border ${color.borde} ${color.fondo} p-2.5`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                  <span className={`truncate text-[11px] font-bold ${color.texto}`}>{grupo.nombre}</span>
                </div>
                <span
                  className={`shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold ${color.texto}`}
                >
                  {rango}
                </span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2">
                {grupo.indices.map((index) => {
                  const p = preguntas[index];
                  const base: EstadoBasePildora = preguntasMarcadas.has(p.id)
                    ? 'marcada'
                    : respuestas[p.id]
                    ? 'respondida'
                    : 'pendiente';

                  return (
                    <button
                      key={p.id}
                      onClick={() => irAPregunta(index)}
                      disabled={submitting}
                      title={`Ir a la pregunta ${index + 1} · ${grupo.nombre}`}
                      className={`h-11 w-full rounded-xl flex items-center justify-center text-sm transition-all duration-200 ${clasePildora(
                        base,
                        index === preguntaActualIdx
                      )}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

const VERSION_BORRADOR = 1;
const HORAS_VALIDEZ_BORRADOR = 8;

export default function SimulacroPage({ params }: SimulacroPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const examenId = resolvedParams.id;
  const router = useRouter();

  // --- MODO: simulacro (cronometrado) o entrenamiento (práctica, sin reloj) ---
  const [modo, setModo] = useState<'simulacro' | 'entrenamiento'>('simulacro');
  const esPractica = modo === 'entrenamiento';

  // Estado del examen
  const [examen, setExamen] = useState<ExamenDetalle | null>(null);
  const [intentoId, setIntentoId] = useState<string | null>(null);
  const [preguntaActualIdx, setPreguntaActualIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  // Preguntas ya reveladas en práctica (muestran feedback y bloquean cambio)
  const [reveladas, setReveladas] = useState<Record<string, boolean>>({});
  // Primera alternativa elegida por pregunta (para no "borrar" el aprendizaje
  // cuando el docente decide reintentar en modo práctica)
  const [primeraEleccion, setPrimeraEleccion] = useState<Record<string, string>>({});
  const [preguntaACambiar, setPreguntaACambiar] = useState<string | null>(null);

  // Tiempo y controles
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [esPausado, setEsPausado] = useState(false);
  const [esTimeout, setEsTimeout] = useState(false);
  const [preguntasMarcadas, setPreguntasMarcadas] = useState<Set<string>>(new Set());

  // Interfaz
  const [mostrarTextoBase, setMostrarTextoBase] = useState(true);
  const [mostrarMapaMovil, setMostrarMapaMovil] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // Flujo de abandono/salida
  const [isAborting, setIsAborting] = useState(false);
  const [mostrarConfirmacionSalida, setMostrarConfirmacionSalida] = useState(false);

  // 🛟 Red de seguridad: borrador local, conexión y reintentos de envío
  const [borradorDetectado, setBorradorDetectado] = useState<any | null>(null);
  const [ultimoGuardado, setUltimoGuardado] = useState<number | null>(null);
  const [enLinea, setEnLinea] = useState(true);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [intentosEnvio, setIntentosEnvio] = useState(0);

  // Audio
  const lector = useLectorVoz();

  // Refs para evitar stale closures
  const respuestasRef = useRef(respuestas);
  const intentoIdRef = useRef(intentoId);
  const examenRef = useRef(examen);
  const submittingRef = useRef(submitting);
  const tiempoRestanteRef = useRef(tiempoRestante);
  const preguntasMarcadasRef = useRef(preguntasMarcadas);
  const reveladasRef = useRef(reveladas);
  const preguntaActualIdxRef = useRef(preguntaActualIdx);
  const finalizarSimulacroRef = useRef<(porTimeout?: boolean) => void>(() => {});
  const inicioRef = useRef<number>(Date.now());
  const salidaIntencionalRef = useRef(false);
  const sincronizacionRemotaRef = useRef(true); // se apaga sola si el endpoint no existe

  useEffect(() => {
    respuestasRef.current = respuestas;
    intentoIdRef.current = intentoId;
    examenRef.current = examen;
    submittingRef.current = submitting;
    tiempoRestanteRef.current = tiempoRestante;
    preguntasMarcadasRef.current = preguntasMarcadas;
    reveladasRef.current = reveladas;
    preguntaActualIdxRef.current = preguntaActualIdx;
  });

  const claveBorrador = useMemo(() => `docentesmart:borrador:${examenId}:${modo}`, [examenId, modo]);

  // ==========================================
  // 🛟 GUARDADO LOCAL AUTOMÁTICO
  // Si se cae el internet, se cierra la pestaña o el navegador mata la
  // página por memoria, el avance sigue en el dispositivo y se puede
  // restaurar al volver a entrar.
  // ==========================================
  const guardarBorrador = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const datos = {
        v: VERSION_BORRADOR,
        examenId,
        modo,
        intentoId: intentoIdRef.current,
        respuestas: respuestasRef.current,
        reveladas: reveladasRef.current,
        marcadas: Array.from(preguntasMarcadasRef.current),
        preguntaActualIdx: preguntaActualIdxRef.current,
        tiempoRestante: tiempoRestanteRef.current,
        ts: Date.now(),
      };
      window.localStorage.setItem(claveBorrador, JSON.stringify(datos));
      setUltimoGuardado(datos.ts);
    } catch {
      // Cuota llena o modo privado: el examen sigue funcionando igual.
    }
  }, [claveBorrador, examenId, modo]);

  const borrarBorrador = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(claveBorrador);
    } catch {
      /* noop */
    }
  }, [claveBorrador]);

  // Guarda ante cualquier cambio relevante (el reloj se toma del ref,
  // para no escribir en disco una vez por segundo).
  useEffect(() => {
    if (loading || !examen || submitting) return;
    guardarBorrador();
  }, [respuestas, reveladas, preguntasMarcadas, preguntaActualIdx, loading, examen, submitting, guardarBorrador]);

  // Guardado adicional cada 20 s y al ocultar la pestaña (móvil)
  useEffect(() => {
    if (loading || !examen) return;
    const intervalo = setInterval(guardarBorrador, 20000);
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') guardarBorrador();
    };
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alOcultar);
    };
  }, [loading, examen, guardarBorrador]);

  // Sincronización remota best-effort (opcional). Si tu backend aún no
  // expone /intentos/:id/progreso, el primer fallo la desactiva sin ruido.
  useEffect(() => {
    if (loading || !examen || submitting) return;
    const intervalo = setInterval(async () => {
      if (!sincronizacionRemotaRef.current) return;
      const id = intentoIdRef.current;
      if (!id || !navigator.onLine) return;
      try {
        await fetchAPI(`/intentos/${id}/progreso`, {
          method: 'PATCH',
          body: JSON.stringify({
            respuestas: Object.entries(respuestasRef.current).map(([pregunta_id, opcion_id]) => ({
              pregunta_id,
              opcion_seleccionada_id: opcion_id,
            })),
            tiempo_restante_segundos: tiempoRestanteRef.current,
          }),
        });
      } catch {
        sincronizacionRemotaRef.current = false;
      }
    }, 45000);
    return () => clearInterval(intervalo);
  }, [loading, examen, submitting]);

  // Estado de conexión
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setEnLinea(navigator.onLine);
    const conectar = () => setEnLinea(true);
    const desconectar = () => setEnLinea(false);
    window.addEventListener('online', conectar);
    window.addEventListener('offline', desconectar);
    return () => {
      window.removeEventListener('online', conectar);
      window.removeEventListener('offline', desconectar);
    };
  }, []);

  // ==========================================
  // 🛡️ AVISO NATIVO AL CERRAR (acotado)
  // Solo en simulacro y solo si hay respuestas: en práctica no tiene
  // sentido molestar con el diálogo de Brave/Chrome, porque el avance
  // ya queda guardado en el dispositivo.
  // ==========================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (salidaIntencionalRef.current) return;
      if (submittingRef.current || loading || !examenRef.current) return;
      if (esPractica) return;
      if (Object.keys(respuestasRef.current).length === 0) return;
      guardarBorrador();
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading, esPractica, guardarBorrador]);

  // Corta el audio al cambiar de pregunta o de modo
  useEffect(() => {
    return () => lector.detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaActualIdx, modo]);

  // ==========================================
  // 1. INICIALIZACIÓN (Carga Examen + Crear Intento) SEGÚN EL MODO
  // ==========================================
  useEffect(() => {
    async function initSimulacro() {
      try {
        setLoading(true);

        const url = esPractica ? `/examenes/${examenId}/entrenamiento` : `/examenes/${examenId}`;
        const rawData = await fetchAPI<any>(url);
        const examenAdaptado = adaptarExamen(rawData);
        setExamen(examenAdaptado);

        // El reloj solo existe en simulacro: la práctica es sin presión.
        if (!esPractica && examenAdaptado?.duracion_minutos) {
          setTiempoRestante(examenAdaptado.duracion_minutos * 60);
        } else {
          setTiempoRestante(0);
        }
        inicioRef.current = Date.now();

        const intentoRes = await fetchAPI<{ id?: string; intento_id?: string; usuario_id?: string }>(
          '/intentos',
          {
            method: 'POST',
            body: JSON.stringify({
              examen_id: examenId,
              modo: esPractica ? 'practica' : 'simulacro',
            }),
          }
        );

        const idRecuperado = intentoRes?.id || intentoRes?.intento_id;
        if (idRecuperado) setIntentoId(idRecuperado);

        // Progreso limpio para el modo recién abierto
        setPreguntaActualIdx(0);
        setRespuestas({});
        setReveladas({});
        setPrimeraEleccion({});
        setPreguntasMarcadas(new Set());
        setErrorEnvio(null);
        setIntentosEnvio(0);

        // ¿Hay un avance guardado de una sesión anterior en este dispositivo?
        try {
          const crudo = window.localStorage.getItem(`docentesmart:borrador:${examenId}:${modo}`);
          if (crudo) {
            const borrador = JSON.parse(crudo);
            const horas = (Date.now() - (borrador?.ts || 0)) / 3600000;
            const tieneRespuestas = Object.keys(borrador?.respuestas || {}).length > 0;
            if (borrador?.v === VERSION_BORRADOR && horas < HORAS_VALIDEZ_BORRADOR && tieneRespuestas) {
              setBorradorDetectado(borrador);
            } else {
              window.localStorage.removeItem(`docentesmart:borrador:${examenId}:${modo}`);
            }
          }
        } catch {
          /* borrador corrupto: lo ignoramos */
        }
      } catch (err: any) {
        console.error('ERROR CRÍTICO EN INICIALIZACIÓN:', err);
        if (err?.status === 403) {
          alert('No tienes permiso para acceder a este examen o ya pertenece a otro usuario.');
          router.push('/examenes');
        } else {
          alert(err?.error || 'Error al conectar con el servidor.');
          router.push('/examenes');
        }
      } finally {
        setLoading(false);
      }
    }

    if (examenId) initSimulacro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examenId, modo, router]);

  const restaurarBorrador = () => {
    if (!borradorDetectado) return;
    setRespuestas(borradorDetectado.respuestas || {});
    setReveladas(borradorDetectado.reveladas || {});
    setPreguntasMarcadas(new Set(borradorDetectado.marcadas || []));
    setPreguntaActualIdx(borradorDetectado.preguntaActualIdx || 0);
    if (!esPractica && typeof borradorDetectado.tiempoRestante === 'number' && borradorDetectado.tiempoRestante > 0) {
      setTiempoRestante(borradorDetectado.tiempoRestante);
    }
    setBorradorDetectado(null);
  };

  const descartarBorrador = () => {
    borrarBorrador();
    setBorradorDetectado(null);
  };

  // ==========================================
  // 2. FINALIZACIÓN / ENVÍO (manual, timeout y reintento)
  // ==========================================
  const finalizarSimulacro = async (porTimeout: boolean = false) => {
    const curExamen = examenRef.current;
    const curIntentoId = intentoIdRef.current;
    const curSubmitting = submittingRef.current;
    const curRespuestas = respuestasRef.current;
    const curTiempoRestante = tiempoRestanteRef.current;

    if (!curExamen || !curIntentoId || curSubmitting) return;

    lector.detener();
    guardarBorrador(); // último resguardo antes de salir a la red

    setSubmitting(true);
    setErrorEnvio(null);
    setMostrarConfirmacion(false);
    if (porTimeout) {
      setEsTimeout(true);
      setEsPausado(false);
    }

    const duracionSegundosTotal = (curExamen.duracion_minutos || 180) * 60;
    const tiempoEmpleado = esPractica
      ? Math.max(0, Math.floor((Date.now() - inicioRef.current) / 1000))
      : porTimeout
      ? duracionSegundosTotal
      : Math.max(0, duracionSegundosTotal - curTiempoRestante);

    const payload = {
      tiempo_empleado_segundos: tiempoEmpleado,
      respuestas: Object.entries(curRespuestas).map(([pregunta_id, opcion_id]) => ({
        pregunta_id,
        opcion_seleccionada_id: opcion_id,
      })),
    };

    try {
      await fetchAPI(`/intentos/${curIntentoId}/finalizar`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      borrarBorrador();
      salidaIntencionalRef.current = true;
      router.push(`/resultados/${curIntentoId}`);
    } catch (err: any) {
      console.error('Error al enviar examen:', err);

      if (err?.error === 'CUENTA_MISMATCH') {
        setErrorEnvio(
          'La cuenta actual no coincide con la que inició el examen. Inicia sesión con el correo correcto y vuelve a intentarlo.'
        );
        setSubmitting(false);
        setEsTimeout(false);
        return;
      }

      if (err?.error === 'INTENTO_YA_FINALIZADO') {
        borrarBorrador();
        salidaIntencionalRef.current = true;
        router.push(`/resultados/${curIntentoId}`);
        return;
      }

      // Falla de red: el avance sigue guardado y ofrecemos reintentar.
      setIntentosEnvio((n) => n + 1);
      setErrorEnvio(
        navigator.onLine
          ? 'No pudimos enviar tus respuestas al servidor. Tu avance está guardado en este dispositivo.'
          : 'Estás sin conexión. Tu avance está guardado en este dispositivo: reconéctate y vuelve a enviar.'
      );
      setSubmitting(false);
      setEsTimeout(false);
    }
  };

  useEffect(() => {
    finalizarSimulacroRef.current = finalizarSimulacro;
  });

  // Reintento automático cuando vuelve la conexión
  useEffect(() => {
    if (errorEnvio && enLinea && intentosEnvio > 0 && intentosEnvio < 4) {
      const t = setTimeout(() => finalizarSimulacroRef.current(false), 4000);
      return () => clearTimeout(t);
    }
  }, [errorEnvio, enLinea, intentosEnvio]);

  // ==========================================
  // 🛡️ 2.b ABANDONO VOLUNTARIO (borra el intento y el borrador local)
  // ==========================================
  const confirmarSalidaYBorrarIntento = async () => {
    const id = intentoIdRef.current;
    salidaIntencionalRef.current = true;
    borrarBorrador();

    if (!id) {
      router.push('/examenes');
      return;
    }

    try {
      setIsAborting(true);
      lector.detener();
      await abandonarIntento(id);
      setIntentoId(null);
      router.replace('/examenes');
    } catch (err) {
      console.error('Error al abandonar el intento:', err);
      router.replace('/examenes');
    } finally {
      setIsAborting(false);
    }
  };

  // ==========================================
  // 3. TEMPORIZADOR (solo simulacro)
  // ==========================================
  useEffect(() => {
    if (esPractica) return;
    const tieneTiempo = tiempoRestante > 0;
    if (!tieneTiempo || esPausado || loading || submitting) return;

    const interval = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submittingRef.current) finalizarSimulacroRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, esPausado, submitting, tiempoRestante > 0, esPractica]);

  // ==========================================
  // 4. TEXTOS BASE (CASOS PEDAGÓGICOS)
  // ==========================================
  useEffect(() => {
    if (!examen || !examen.preguntas || examen.preguntas.length === 0) return;
    const pregActual = examen.preguntas[preguntaActualIdx];

    if (!pregActual || !pregActual.texto_base_id) {
      setMostrarTextoBase(false);
      return;
    }

    const pregAnterior = preguntaActualIdx > 0 ? examen.preguntas[preguntaActualIdx - 1] : null;
    setMostrarTextoBase(!pregAnterior || pregAnterior.texto_base_id !== pregActual.texto_base_id);
  }, [preguntaActualIdx, examen]);

  // ==========================================
  // 5. INTERACCIONES
  // ==========================================
  const seleccionarAlternativa = (preguntaId: string, alternativaId: string) => {
    if (submitting) return;
    if (esPractica && reveladas[preguntaId]) return; // ya revelada: se cambia desde el sustento

    setRespuestas((prev) => ({ ...prev, [preguntaId]: alternativaId }));

    if (esPractica) {
      setReveladas((prev) => ({ ...prev, [preguntaId]: true }));
      setPrimeraEleccion((prev) => (prev[preguntaId] ? prev : { ...prev, [preguntaId]: alternativaId }));
    }
  };

  // Práctica: permite volver a elegir tras ver el sustento (con confirmación)
  const confirmarCambioDeRespuesta = () => {
    const pid = preguntaACambiar;
    if (!pid) return;
    lector.detener();
    setReveladas((prev) => {
      const copia = { ...prev };
      delete copia[pid];
      return copia;
    });
    setRespuestas((prev) => {
      const copia = { ...prev };
      delete copia[pid];
      return copia;
    });
    setPreguntaACambiar(null);
  };

  const toggleMarcarPregunta = (preguntaId: string) => {
    if (submitting) return;
    setPreguntasMarcadas((prev) => {
      const nuevoSet = new Set(prev);
      if (nuevoSet.has(preguntaId)) nuevoSet.delete(preguntaId);
      else nuevoSet.add(preguntaId);
      return nuevoSet;
    });
  };

  const irAPregunta = (index: number) => {
    setPreguntaActualIdx(index);
    setMostrarMapaMovil(false);
  };

  const pausarSimulacro = () => {
    lector.detener();
    setEsPausado(true);
  };

  const solicitarSalida = () => {
    setMostrarConfirmacion(false);
    setMostrarMapaMovil(false);
    setMostrarConfirmacionSalida(true);
  };

  const cambiarModo = (nuevo: 'simulacro' | 'entrenamiento') => {
    if (submitting || nuevo === modo) return;
    lector.detener();
    setModo(nuevo);
  };

  // ==========================================
  // RENDER: PANTALLA DE CARGA
  // ==========================================
  if (loading || !examen) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">
            {esPractica ? 'Preparando tu práctica guiada...' : 'Cargando simulacro en vivo...'}
          </p>
        </div>
      </div>
    );
  }

  // Variables derivadas
  const preguntaActual = examen.preguntas[preguntaActualIdx];
  const totalPreguntas = examen.preguntas.length;

  if (!preguntaActual) {
    return <div className="p-10 text-center text-slate-500">Cargando pregunta...</div>;
  }

  const respondidasCount = Object.keys(respuestas).length;
  const esUltimaPregunta = preguntaActualIdx === totalPreguntas - 1;
  const textoBaseActual = examen?.textos_base?.find((tb: any) => tb.id === preguntaActual?.texto_base_id);
  const avance = totalPreguntas ? Math.round((respondidasCount / totalPreguntas) * 100) : 0;
  const preguntaMarcadaActual = preguntasMarcadas.has(preguntaActual.id);
  const mostrarResultadoActual = esPractica && !!reveladas[preguntaActual.id];
  const opcionesActuales = (preguntaActual?.opciones ||
    (preguntaActual as any).alternativas ||
    []) as Opcion[];

  // Texto que se lee en voz alta para la pregunta actual
  const textoPreguntaCompleta = () => {
    const opcionesTexto = opcionesActuales
      .map((o) => `Alternativa ${o.etiqueta || (o as any).letra}. ${o.texto_opcion || (o as any).texto}`)
      .join('. ');
    return `Pregunta ${preguntaActualIdx + 1}. ${
      preguntaActual.texto_pregunta || (preguntaActual as any).enunciado
    }. ${opcionesTexto}`;
  };

  const hablarPreguntaActual = () => lector.hablar(textoPreguntaCompleta(), 'pregunta');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-28 lg:pb-0 overflow-x-hidden">
      {/* Utilidades locales: scroll sin barra visible y respeto del notch */}
      <style>{`
        .ds-scroll::-webkit-scrollbar { display: none; }
        .ds-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .ds-safe-bottom { padding-bottom: calc(0.75rem + env(safe-area-inset-bottom)); }
      `}</style>

      {/* OVERLAY: ENVIANDO (ventana de espera explícita) */}
      {submitting && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[130] flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-extrabold mb-1">Enviando tus respuestas</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              No cierres esta ventana. Si la conexión falla, tu avance queda guardado en este dispositivo y
              podrás reintentar.
            </p>
          </div>
        </div>
      )}

      {/* MODAL: ERROR DE ENVÍO CON REINTENTO */}
      {errorEnvio && !submitting && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <WifiOff className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">No se pudo enviar</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{errorEnvio}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl py-2 px-3">
              <ShieldCheck className="w-4 h-4" /> {respondidasCount} respuestas guardadas localmente
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => finalizarSimulacro(false)}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Reintentar envío
              </button>
              <button
                onClick={() => setErrorEnvio(null)}
                className="w-full py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Volver al examen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESTAURAR AVANCE GUARDADO */}
      {borradorDetectado && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[125] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-7 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <History className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">Tienes un avance guardado</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Encontramos {Object.keys(borradorDetectado.respuestas || {}).length} respuestas de tu última
                sesión en este dispositivo. ¿Continuamos desde ahí?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={restaurarBorrador}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
              >
                Continuar donde quedé
              </button>
              <button
                onClick={descartarBorrador}
                className="w-full py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
              >
                Empezar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY DE TIMEOUT */}
      {esTimeout && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[120] flex flex-col items-center justify-center text-white p-4">
          <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2 text-red-600">Tiempo agotado</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              El tiempo del simulacro terminó. Estamos evaluando tus respuestas.
            </p>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        </div>
      )}

      {/* OVERLAY DE PAUSA */}
      {esPausado && !esTimeout && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[120] flex flex-col items-center justify-center text-white p-4">
          <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">Simulacro pausado</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              El reloj y el examen están detenidos. Reanuda cuando estés listo.
            </p>
            <button
              onClick={() => setEsPausado(false)}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> Reanudar prueba
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR RESPUESTA EN PRÁCTICA */}
      {preguntaACambiar && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[115] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-14 h-14 bg-fuchsia-50 text-fuchsia-600 rounded-full flex items-center justify-center mx-auto">
              <RotateCcw className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">¿Quieres elegir otra alternativa?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Estás en práctica, así que puedes volver a intentarlo. Se ocultará el sustento hasta que
              respondas de nuevo. Guardaremos cuál fue tu primera elección.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button
                onClick={() => setPreguntaACambiar(null)}
                className="w-full sm:flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Mantener mi respuesta
              </button>
              <button
                onClick={confirmarCambioDeRespuesta}
                className="w-full sm:flex-1 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold text-sm transition-colors"
              >
                Sí, volver a intentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE SALIDA / ABANDONO */}
      {mostrarConfirmacionSalida && !esTimeout && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-7 shadow-2xl border border-slate-100 text-center space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <LogOut className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">¿Deseas abandonar?</h3>
              <p className="text-slate-500 leading-relaxed font-medium text-sm">
                Si sales ahora, <span className="text-red-600 font-bold">tu progreso se perderá</span> y este
                intento no aparecerá en tu historial de resultados.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 text-left border border-slate-100">
              <Trash2 className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-xs text-slate-500 font-semibold">
                Se eliminará el avance actual en la base de datos y en este dispositivo.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmarSalidaYBorrarIntento}
                disabled={isAborting}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-xl shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAborting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sí, salir y descartar'}
              </button>
              <button
                onClick={() => setMostrarConfirmacionSalida(false)}
                disabled={isAborting}
                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
              >
                Continuar con el examen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMACIÓN DE ENTREGA */}
      {mostrarConfirmacion && !esTimeout && !mostrarConfirmacionSalida && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Send className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              {esPractica ? '¿Terminar la práctica?' : '¿Entregar simulacro?'}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Has respondido <strong className="text-slate-800">{respondidasCount}</strong> de{' '}
              <strong className="text-slate-800">{totalPreguntas}</strong> preguntas.
            </p>
            {respondidasCount < totalPreguntas && (
              <span className="flex items-center gap-2 text-amber-700 font-bold bg-amber-50 p-3 rounded-xl border border-amber-200 text-left text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Faltan {totalPreguntas - respondidasCount} preguntas sin responder.
              </span>
            )}
            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                disabled={submitting}
                className="w-full sm:flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Revisar más
              </button>
              <button
                onClick={() => finalizarSimulacro(false)}
                disabled={submitting}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  'Sí, entregar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOJA INFERIOR: MAPA DE PREGUNTAS (MÓVIL) */}
      {mostrarMapaMovil && (
        <div className="fixed inset-0 z-[105] lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setMostrarMapaMovil(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] shadow-2xl max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <span className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="px-5 pb-3 flex items-center justify-between gap-3 border-b border-slate-100 shrink-0">
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-blue-600" /> Mapa del examen
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {respondidasCount} de {totalPreguntas} respondidas · {preguntasMarcadas.size} marcadas
                </p>
              </div>
              <button
                onClick={() => setMostrarMapaMovil(false)}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors shrink-0"
                aria-label="Cerrar mapa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto ds-scroll">
              <ContenidoMapa
                preguntas={examen.preguntas as any[]}
                respuestas={respuestas}
                preguntasMarcadas={preguntasMarcadas}
                preguntaActualIdx={preguntaActualIdx}
                irAPregunta={irAPregunta}
                submitting={submitting}
                alturaLista=""
              />
            </div>

            <div className="px-5 pt-3 border-t border-slate-100 ds-safe-bottom shrink-0">
              <button
                onClick={() => {
                  setMostrarMapaMovil(false);
                  setMostrarConfirmacion(true);
                }}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-sm transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {esPractica ? 'Terminar práctica' : 'Terminar y evaluar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          HEADER COMPACTO (móvil primero)
          Fila 1: salir + título + reloj (solo simulacro) + mapa
          Fila 2: selector de modo + acciones deslizables
          ========================================== */}
      <header
        className={`relative sticky top-0 z-40 w-full max-w-full overflow-hidden border-b transition-colors duration-500 ${
          esPractica
            ? 'bg-gradient-to-br from-[#2a0b3d] via-[#3b0d57] to-[#190a2e] border-fuchsia-900/50'
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-slate-800'
        }`}
      >
        <div
          className={`pointer-events-none absolute inset-x-0 -top-20 h-32 blur-3xl opacity-40 transition-colors duration-500 ${
            esPractica ? 'bg-fuchsia-500' : 'bg-blue-500'
          }`}
        />

        {/* Fila 1 */}
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 pt-2.5 flex items-center gap-2">
          <button
            onClick={solicitarSalida}
            disabled={submitting || isAborting}
            className="shrink-0 inline-flex items-center gap-1.5 text-slate-300 hover:text-red-300 bg-white/5 hover:bg-red-500/10 p-2 sm:px-3 sm:py-2 rounded-xl transition-colors text-sm font-semibold disabled:opacity-50 border border-white/10"
            aria-label="Salir del examen"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>

          <h1 className="flex-1 min-w-0 text-sm md:text-base font-extrabold text-white truncate">
            {examen.titulo}
          </h1>

          {!esPractica && tiempoRestante > 0 && (
            <div
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition-colors ${claseReloj(
                tiempoRestante
              )}`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTiempo(tiempoRestante)}</span>
            </div>
          )}

          <button
            onClick={() => setMostrarMapaMovil(true)}
            disabled={submitting}
            className="lg:hidden shrink-0 flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold bg-white/5 border border-white/10 text-slate-200 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
            aria-label="Abrir mapa de preguntas"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="tabular-nums">
              {preguntaActualIdx + 1}/{totalPreguntas}
            </span>
          </button>
        </div>

        {/* Fila 2: modo + acciones (deslizable horizontalmente en móvil) */}
        <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto ds-scroll -mx-1 px-1">
            {/* SELECTOR DE MODO (premium) */}
            <div className="relative shrink-0 flex bg-black/25 p-1 rounded-2xl border border-white/10 shadow-inner">
              <div
                className={`absolute inset-y-1 w-[calc(50%-2px)] rounded-xl transition-all duration-300 ease-out ${
                  esPractica
                    ? 'left-[calc(50%+1px)] bg-gradient-to-br from-fuchsia-500 via-purple-500 to-violet-600 shadow-lg shadow-fuchsia-900/60'
                    : 'left-1 bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/60'
                }`}
              />
              <button
                onClick={() => cambiarModo('simulacro')}
                disabled={submitting}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-tight transition-colors disabled:opacity-50 ${
                  !esPractica ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" /> Simulacro
              </button>
              <button
                onClick={() => cambiarModo('entrenamiento')}
                disabled={submitting}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold tracking-tight transition-colors disabled:opacity-50 ${
                  esPractica ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Práctica
              </button>
            </div>

            {/* Descripción del modo: solo en pantallas con espacio */}
            <span
              className={`hidden md:inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-xl border ${
                esPractica
                  ? 'bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-400/20'
                  : 'bg-blue-500/10 text-blue-200 border-blue-400/20'
              }`}
            >
              {esPractica ? 'Sustento inmediato, sin reloj' : 'Cronometrado, resultados al final'}
            </span>

            <span className="shrink-0 w-px h-7 bg-white/10 mx-0.5" />

            {/* Audio de la pregunta */}
            <BotonAudio
              estado={lector.estadoDe('pregunta')}
              onClick={hablarPreguntaActual}
              onDetener={() => lector.detener()}
              disabled={submitting || !lector.soportado}
              className="shrink-0 p-2.5 rounded-xl bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 border border-white/10"
              titulo="Escuchar la pregunta y sus alternativas"
              size={18}
              mostrarDetener={false}
            />

            {/* Marcar para revisión */}
            <button
              onClick={() => toggleMarcarPregunta(preguntaActual.id)}
              disabled={submitting}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border rounded-xl transition-all ${
                preguntaMarcadaActual
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Flag className={`w-4 h-4 ${preguntaMarcadaActual ? 'fill-amber-400' : ''}`} />
              {preguntaMarcadaActual ? 'Marcada' : 'Marcar'}
            </button>

            {/* Pausa: solo tiene sentido con reloj */}
            {!esPractica && (
              <button
                onClick={pausarSimulacro}
                disabled={submitting}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold bg-white/5 border border-white/10 text-slate-300 rounded-xl hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                <Pause className="w-4 h-4" /> Pausar
              </button>
            )}

            {/* Indicador de guardado */}
            {ultimoGuardado && (
              <span className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 rounded-xl">
                <ShieldCheck className="w-3.5 h-3.5" /> Avance guardado
              </span>
            )}
          </div>
        </div>

        {/* Barra de avance */}
        <div className="h-1 w-full bg-white/5">
          <div
            className={`h-full transition-all duration-500 ${
              esPractica ? 'bg-gradient-to-r from-fuchsia-500 to-violet-400' : 'bg-blue-500'
            }`}
            style={{ width: `${avance}%` }}
          />
        </div>
      </header>

      {/* AVISO DE CONEXIÓN */}
      {!enLinea && (
        <div className="z-30 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-800 text-xs font-semibold">
          <WifiOff className="w-4 h-4 shrink-0" />
          Sin conexión. Sigue respondiendo: tu avance se guarda en este dispositivo.
        </div>
      )}

      {/* CUERPO PRINCIPAL */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* ÁREA DE LA PREGUNTA */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-5">
          <div className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-200">
            {/* Cabecera de la pregunta */}
            <div className="flex flex-wrap items-center gap-2 pb-3 mb-5 border-b border-slate-100">
              <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                Pregunta {preguntaActualIdx + 1} de {totalPreguntas}
              </span>

              {(() => {
                const nombreComp = nombreComponenteExamen(preguntaActual);
                const colorComp = colorDeComponente(nombreComp);
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${colorComp.fondo} ${colorComp.texto} ${colorComp.borde}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${colorComp.dot}`} />
                    {nombreComp}
                  </span>
                );
              })()}

              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> {respondidasCount}/{totalPreguntas}
              </span>
            </div>

            {/* TEXTO BASE (LECTURA Y CASOS) */}
            {textoBaseActual && (
              <div className="mb-6 rounded-2xl border-2 border-blue-100 bg-blue-50/50 overflow-hidden">
                <div className="w-full p-3 bg-white border-b border-blue-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setMostrarTextoBase((prev) => !prev)}
                    className="flex items-center gap-2 text-left min-w-0 flex-1"
                  >
                    <span className="flex items-center gap-2 text-blue-900 font-extrabold text-sm truncate pr-2">
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span className="truncate">{textoBaseActual.titulo || 'Caso pedagógico / Lectura'}</span>
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <BotonAudio
                      estado={lector.estadoDe('texto_base')}
                      onClick={(e) => {
                        e.stopPropagation();
                        lector.hablar(`Caso de estudio. ${textoBaseActual.contenido}`, 'texto_base');
                      }}
                      onDetener={(e) => {
                        e.stopPropagation();
                        lector.detener();
                      }}
                      disabled={!lector.soportado}
                      className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                      titulo="Escuchar el caso"
                      size={16}
                    />

                    <button
                      onClick={() => setMostrarTextoBase((prev) => !prev)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                    >
                      {mostrarTextoBase ? (
                        <>
                          Ocultar <ChevronUp className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Leer caso <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {mostrarTextoBase && (
                  <div className="p-4 sm:p-6 text-slate-800 text-sm sm:text-base max-h-[38vh] overflow-y-auto ds-scroll">
                    <QuestionText text={textoBaseActual.contenido} className="leading-relaxed" />
                  </div>
                )}
              </div>
            )}

            {/* Imagen del enunciado */}
            {preguntaActual.url_imagen && (
              <div className="mb-5 flex justify-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <img
                  src={preguntaActual.url_imagen}
                  alt="Recurso visual de la pregunta"
                  className="max-h-64 w-auto object-contain rounded-xl"
                />
              </div>
            )}

            {/* Enunciado + audio */}
            <div className="flex items-start justify-between gap-3 mb-6">
              <div
                role="heading"
                aria-level={2}
                className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 flex-1 min-w-0"
              >
                <QuestionText
                  text={preguntaActual.texto_pregunta || (preguntaActual as any).enunciado}
                  className="leading-snug"
                />
              </div>

              <BotonAudio
                estado={lector.estadoDe('pregunta')}
                onClick={hablarPreguntaActual}
                onDetener={() => lector.detener()}
                disabled={submitting || !lector.soportado}
                className="shrink-0 p-3 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 shadow-lg transition-all disabled:opacity-50"
                titulo="Escuchar la pregunta y sus alternativas"
                size={20}
              />
            </div>

            {/* Alternativas */}
            <div className="space-y-3">
              {opcionesActuales.map((alt) => {
                const seleccionada = respuestas[preguntaActual.id] === alt.id;
                const etiqueta = alt.etiqueta || (alt as any).letra || '•';
                const textoOpcion = alt.texto_opcion || (alt as any).texto;
                const esCorrecta = (alt as any).es_correcta;

                let borderClass = 'border-slate-200 hover:border-blue-300 bg-white shadow-sm';
                if (seleccionada) {
                  borderClass = 'border-blue-600 bg-blue-50/80 shadow-md ring-4 ring-blue-600/10';
                }

                if (mostrarResultadoActual) {
                  if (esCorrecta) {
                    borderClass = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500';
                  } else if (seleccionada && !esCorrecta) {
                    borderClass = 'border-red-500 bg-red-50 ring-2 ring-red-500';
                  } else {
                    borderClass = 'border-slate-200 bg-white opacity-70';
                  }
                }

                return (
                  <button
                    key={alt.id}
                    onClick={() => seleccionarAlternativa(preguntaActual.id, alt.id)}
                    disabled={submitting || mostrarResultadoActual}
                    className={`w-full text-left p-3.5 sm:p-5 rounded-2xl border-2 transition-all flex items-center gap-3 sm:gap-5 group ${borderClass}`}
                  >
                    <span
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 transition-colors ${
                        seleccionada
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}
                    >
                      {etiqueta}
                    </span>
                    <span
                      className={`flex-1 text-sm sm:text-base leading-relaxed ${
                        seleccionada ? 'text-blue-950 font-medium' : 'text-slate-700'
                      }`}
                    >
                      <InlineText text={textoOpcion} />
                    </span>
                    {seleccionada && !mostrarResultadoActual && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* SUSTENTO PEDAGÓGICO (práctica, tras responder) */}
            {mostrarResultadoActual && (
              <div className="mt-6 p-4 sm:p-6 bg-amber-50 border border-amber-100 rounded-3xl animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <Lightbulb className="w-5 h-5" />
                    <h4>Sustento pedagógico</h4>
                  </div>

                  {/* Un solo botón: escuchar / pausar / reanudar */}
                  <BotonAudio
                    estado={lector.estadoDe('explicacion')}
                    onClick={() =>
                      lector.hablar(
                        `Sustento pedagógico. ${
                          (preguntaActual as any).explicacion ||
                          'No hay explicación disponible para esta pregunta.'
                        }`,
                        'explicacion'
                      )
                    }
                    onDetener={() => lector.detener()}
                    disabled={!lector.soportado}
                    className="p-2.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white transition-all shrink-0"
                    titulo="Escuchar el sustento"
                    size={18}
                  />
                </div>

                <p className="text-slate-700 leading-relaxed text-sm sm:text-base">
                  {(preguntaActual as any).explicacion || 'No hay explicación disponible para esta pregunta.'}
                </p>

                {primeraEleccion[preguntaActual.id] &&
                  primeraEleccion[preguntaActual.id] !== respuestas[preguntaActual.id] && (
                    <p className="mt-3 text-xs text-amber-700 font-semibold">
                      En tu primer intento habías marcado otra alternativa.
                    </p>
                  )}

                <button
                  onClick={() => setPreguntaACambiar(preguntaActual.id)}
                  className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-amber-200 text-amber-800 font-bold text-sm hover:bg-amber-100 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" /> Elegir otra alternativa
                </button>
              </div>
            )}
          </div>

          {/* Navegación desktop (en móvil va en la barra fija inferior) */}
          <div className="hidden lg:flex items-center justify-between gap-3 bg-white border border-slate-200 shadow-sm rounded-3xl px-4 py-4">
            <button
              onClick={() => setPreguntaActualIdx((prev) => Math.max(0, prev - 1))}
              disabled={preguntaActualIdx === 0 || submitting}
              className="flex items-center gap-1.5 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>

            {esUltimaPregunta ? (
              <button
                onClick={() => setMostrarConfirmacion(true)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
              >
                Finalizar <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setPreguntaActualIdx((prev) => Math.min(totalPreguntas - 1, prev + 1))}
                disabled={submitting}
                className="flex items-center gap-1.5 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
              >
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* SIDEBAR: MAPA (solo desktop; en móvil vive en la hoja inferior) */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-28 h-fit">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col space-y-5">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-blue-600" /> Mapa del examen
            </h3>

            <ContenidoMapa
              preguntas={examen.preguntas as any[]}
              respuestas={respuestas}
              preguntasMarcadas={preguntasMarcadas}
              preguntaActualIdx={preguntaActualIdx}
              irAPregunta={irAPregunta}
              submitting={submitting}
              alturaLista="max-h-[50vh]"
            />

            <div className="border-t border-slate-100 pt-5">
              <button
                onClick={() => setMostrarConfirmacion(true)}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {esPractica ? 'Terminar práctica' : 'Terminar y evaluar'}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* BARRA INFERIOR FIJA (MÓVIL): anterior · mapa · siguiente */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.15)] px-3 pt-3 ds-safe-bottom flex items-center gap-2">
        <button
          onClick={() => setPreguntaActualIdx((prev) => Math.max(0, prev - 1))}
          disabled={preguntaActualIdx === 0 || submitting}
          className="shrink-0 p-3.5 rounded-2xl border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40"
          aria-label="Pregunta anterior"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setMostrarMapaMovil(true)}
          disabled={submitting}
          className="flex-1 min-w-0 flex flex-col items-center justify-center py-2 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1.5 text-sm font-extrabold">
            <LayoutGrid className="w-4 h-4" /> {respondidasCount}/{totalPreguntas}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">Ver mapa de preguntas</span>
        </button>

        {esUltimaPregunta ? (
          <button
            onClick={() => setMostrarConfirmacion(true)}
            disabled={submitting}
            className="shrink-0 flex items-center gap-1.5 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
          >
            Finalizar <CheckCircle2 className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setPreguntaActualIdx((prev) => Math.min(totalPreguntas - 1, prev + 1))}
            disabled={submitting}
            className={`shrink-0 p-3.5 rounded-2xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
              esPractica
                ? 'bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-fuchsia-200'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
            aria-label="Pregunta siguiente"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}