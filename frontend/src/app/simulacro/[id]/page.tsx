'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';
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
} from 'lucide-react';

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

function claseReloj(segundos: number): string {
  if (segundos < 300) return 'bg-red-100 text-red-700 ring-1 ring-red-200 animate-pulse';
  if (segundos < 900) return 'bg-amber-100 text-amber-800 ring-1 ring-amber-200';
  return 'bg-slate-900 text-white shadow-md';
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

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function SimulacroPage({ params }: SimulacroPageProps) {
  const resolvedParams = params instanceof Promise ? use(params) : params;
  const examenId = resolvedParams.id;
  const router = useRouter();

  // Estado del examen
  const [examen, setExamen] = useState<ExamenDetalle | null>(null);
  const [intentoId, setIntentoId] = useState<string | null>(null);
  const [preguntaActualIdx, setPreguntaActualIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  // Estado de tiempo y controles
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [esPausado, setEsPausado] = useState(false);
  const [esTimeout, setEsTimeout] = useState(false);
  const [preguntasMarcadas, setPreguntasMarcadas] = useState<Set<string>>(new Set());

  // Estado de interfaz
  const [mostrarTextoBase, setMostrarTextoBase] = useState(true);
  const [mostrarMapaMovil, setMostrarMapaMovil] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // Refs para evitar stale closures en el timer y el auto-envío
  const respuestasRef = useRef(respuestas);
  const intentoIdRef = useRef(intentoId);
  const examenRef = useRef(examen);
  const submittingRef = useRef(submitting);
  const tiempoRestanteRef = useRef(tiempoRestante);
  const finalizarSimulacroRef = useRef<(porTimeout?: boolean) => void>(() => {});

  // Un solo efecto sin dependencias mantiene todos los refs sincronizados
  // en cada render, evitando 5 efectos separados haciendo lo mismo.
  useEffect(() => {
    respuestasRef.current = respuestas;
    intentoIdRef.current = intentoId;
    examenRef.current = examen;
    submittingRef.current = submitting;
    tiempoRestanteRef.current = tiempoRestante;
  });

  // ==========================================
  // 1. INICIALIZACIÓN (Carga Examen + Crear Intento)
  // ==========================================
  useEffect(() => {
    async function initSimulacro() {
      try {
        setLoading(true);
        const examenData = await fetchAPI<ExamenDetalle>(`/examenes/${examenId}`);
        setExamen(examenData);

        if (examenData?.duracion_minutos) {
          setTiempoRestante(examenData.duracion_minutos * 60);
        }

        const intentoRes = await fetchAPI<{ id?: string; intento_id?: string }>('/intentos', {
          method: 'POST',
          body: JSON.stringify({ examen_id: examenId, modo: 'simulacro' }),
        });

        const idRecuperado = intentoRes?.id || intentoRes?.intento_id;
        if (idRecuperado) setIntentoId(idRecuperado);
      } catch (err: any) {
        console.error('Error al inicializar simulacro:', err);
        alert(err?.error || 'No tienes acceso a este simulacro o falló el inicio.');
        router.push('/examenes');
      } finally {
        setLoading(false);
      }
    }

    if (examenId) initSimulacro();
  }, [examenId, router]);

  // ==========================================
  // 2. FUNCIÓN DE FINALIZACIÓN / ENVÍO (Soporta Manual y Timeout)
  // ==========================================
  const finalizarSimulacro = async (porTimeout: boolean = false) => {
    const curExamen = examenRef.current;
    const curIntentoId = intentoIdRef.current;
    const curSubmitting = submittingRef.current;
    const curRespuestas = respuestasRef.current;
    const curTiempoRestante = tiempoRestanteRef.current;

    if (!curExamen || !curIntentoId || curSubmitting) return;

    setSubmitting(true);
    if (porTimeout) {
      setEsTimeout(true);
      setEsPausado(false);
    }

    const duracionSegundosTotal = (curExamen.duracion_minutos || 180) * 60;
    // Si finalizó por timeout, consumió la totalidad del tiempo
    const tiempoEmpleado = porTimeout
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
      router.push(`/resultados/${curIntentoId}`);
    } catch (err: any) {
      console.error('Error al enviar examen:', err);
      alert(err?.error || 'Ocurrió un error al enviar tus respuestas.');
      setSubmitting(false);
      setEsTimeout(false);
      setMostrarConfirmacion(false);
    }
  };

  useEffect(() => {
    finalizarSimulacroRef.current = finalizarSimulacro;
  });

  // ==========================================
  // 3. TEMPORIZADOR CON PAUSA Y AUTO-ENVÍO POR TIMEOUT
  // ==========================================
  useEffect(() => {
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
  }, [loading, esPausado, submitting, tiempoRestante > 0]);

  // ==========================================
  // 4. LÓGICA DE TEXTOS BASE (CASOS PEDAGÓGICOS)
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
  // 5. FUNCIONES AUXILIARES DE INTERFAZ
  // ==========================================
  const seleccionarAlternativa = (preguntaId: string, alternativaId: string) => {
    if (submitting) return;
    setRespuestas((prev) => ({ ...prev, [preguntaId]: alternativaId }));
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

  // ==========================================
  // RENDER: PANTALLA DE CARGA
  // ==========================================
  if (loading || !examen) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-9 h-9 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">Cargando simulacro en vivo...</p>
        </div>
      </div>
    );
  }

  // Variables derivadas
  const preguntaActual = examen.preguntas[preguntaActualIdx];
  const totalPreguntas = examen.preguntas.length;
  const respondidasCount = Object.keys(respuestas).length;
  const esUltimaPregunta = preguntaActualIdx === totalPreguntas - 1;
  const textoBaseActual = examen.textos_base?.find((tb) => tb.id === preguntaActual?.texto_base_id);
  const avance = totalPreguntas ? Math.round((respondidasCount / totalPreguntas) * 100) : 0;
  const preguntaMarcadaActual = preguntasMarcadas.has(preguntaActual.id);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24 lg:pb-0">

      {/* OVERLAY DE TIMEOUT (TIEMPO AGOTADO) */}
      {esTimeout && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white p-4">
          <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2 text-red-600">¡Tiempo Agotado!</h2>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              El tiempo asignado para este simulacro ha finalizado. Estamos procesando y evaluando tus respuestas...
            </p>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        </div>
      )}

      {/* OVERLAY DE PAUSA */}
      {esPausado && !esTimeout && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white p-4">
          <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Pause className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">Simulacro Pausado</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              El tiempo y el examen se han detenido. Presiona reanudar cuando estés listo para continuar.
            </p>
            <button
              onClick={() => setEsPausado(false)}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> Reanudar Prueba
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ENTREGA MANUAL */}
      {mostrarConfirmacion && !esTimeout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Send className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">¿Entregar Simulacro?</h3>
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
                  'Sí, Entregar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR / HEADER */}
      <header className="bg-white/95 backdrop-blur-sm sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/examenes')}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 p-2 sm:px-3 sm:py-2 rounded-xl transition-colors text-sm font-semibold disabled:opacity-50 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
            <h1 className="text-sm md:text-base font-extrabold text-slate-800 truncate">{examen.titulo}</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-mono text-sm sm:text-base font-bold transition-colors ${claseReloj(tiempoRestante)}`}>
              <Clock className="w-4 h-4" />
              <span>{formatTiempo(tiempoRestante)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEsPausado(true)}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-white border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                title="Pausar simulacro"
              >
                <Pause className="w-4 h-4" />
                <span className="hidden lg:inline">Pausar</span>
              </button>

              <button
                onClick={() => toggleMarcarPregunta(preguntaActual.id)}
                disabled={submitting}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 rounded-xl transition-all ${
                  preguntaMarcadaActual
                    ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-inner'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
                title="Marcar pregunta para revisión posterior"
              >
                <Flag className={`w-4 h-4 ${preguntaMarcadaActual ? 'fill-amber-500' : ''}`} />
                <span className="hidden lg:inline">{preguntaMarcadaActual ? 'Marcada' : 'Marcar'}</span>
              </button>

              <button
                onClick={() => setMostrarMapaMovil((prev) => !prev)}
                disabled={submitting}
                className="lg:hidden flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-white border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                title="Mapa de preguntas"
              >
                {mostrarMapaMovil ? <X className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Barra de avance */}
        <div className="h-1 w-full bg-slate-100">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${avance}%` }} />
        </div>
      </header>

      {/* CUERPO PRINCIPAL */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* ÁREA DE LA PREGUNTA */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200">

            {/* Header Pregunta */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <span className="text-xs sm:text-sm font-extrabold text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                Pregunta {preguntaActualIdx + 1} de {totalPreguntas}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" /> {respondidasCount}/{totalPreguntas}
              </span>
            </div>

            {/* BLOQUE DE TEXTO BASE (LECTURA Y CASOS) */}
            {textoBaseActual && (
              <div className="mb-8 rounded-2xl border-2 border-blue-100 bg-blue-50/50 overflow-hidden">
                <button
                  onClick={() => setMostrarTextoBase((prev) => !prev)}
                  className="w-full p-3 sm:p-4 bg-white border-b border-blue-100 flex items-center justify-between gap-2 text-left"
                >
                  <span className="flex items-center gap-2 text-blue-900 font-extrabold text-sm truncate pr-2">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="truncate">{textoBaseActual.titulo || 'Caso Pedagógico / Lectura'}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all shrink-0">
                    {mostrarTextoBase ? (
                      <>Ocultar <ChevronUp className="w-4 h-4" /></>
                    ) : (
                      <>Leer caso <ChevronDown className="w-4 h-4" /></>
                    )}
                  </span>
                </button>
                {mostrarTextoBase && (
                  <div className="p-5 sm:p-6 text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line max-h-[40vh] overflow-y-auto">
                    {textoBaseActual.contenido}
                  </div>
                )}
              </div>
            )}

            {/* Imagen del Enunciado (opcional) */}
            {preguntaActual.url_imagen && (
              <div className="mb-6 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <img
                  src={preguntaActual.url_imagen}
                  alt="Recurso visual de la pregunta"
                  className="max-h-64 object-contain rounded-xl"
                />
              </div>
            )}

            {/* Enunciado */}
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-snug mb-8">
              {preguntaActual.texto_pregunta || (preguntaActual as any).enunciado}
            </h2>

            {/* Alternativas */}
            <div className="space-y-3 sm:space-y-4">
              {((preguntaActual?.opciones || (preguntaActual as any).alternativas || []) as Opcion[]).map((alt) => {
                const seleccionada = respuestas[preguntaActual.id] === alt.id;
                const etiqueta = alt.etiqueta || alt.letra || '•';
                const textoOpcion = alt.texto_opcion || (alt as any).texto;

                return (
                  <button
                    key={alt.id}
                    onClick={() => seleccionarAlternativa(preguntaActual.id, alt.id)}
                    disabled={submitting}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center gap-4 sm:gap-5 group ${
                      seleccionada
                        ? 'border-blue-600 bg-blue-50/80 shadow-md ring-4 ring-blue-600/10'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 bg-white shadow-sm'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 transition-colors ${
                        seleccionada
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}
                    >
                      {etiqueta}
                    </span>
                    <span className={`flex-1 text-sm sm:text-base leading-relaxed ${seleccionada ? 'text-blue-950 font-medium' : 'text-slate-700'}`}>
                      {textoOpcion}
                    </span>
                    {seleccionada && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navegación (barra fija en móvil, integrada en desktop) */}
          <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-8px_24px_-8px_rgba(15,23,42,0.15)] px-4 py-3 flex items-center justify-between gap-3 lg:static lg:z-auto lg:bg-white lg:backdrop-blur-none lg:border lg:shadow-sm lg:rounded-3xl lg:px-4 lg:py-4">
            <button
              onClick={() => setPreguntaActualIdx((prev) => Math.max(0, prev - 1))}
              disabled={preguntaActualIdx === 0 || submitting}
              className="flex items-center gap-1.5 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Anterior</span>
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
                <span className="hidden sm:inline">Siguiente</span> <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>

        {/* SIDEBAR: MAPA DE PREGUNTAS (oculto por defecto en móvil) */}
        <aside className={`lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 h-fit ${mostrarMapaMovil ? 'block' : 'hidden'} lg:block`}>
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col space-y-6">
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-blue-600" /> Mapa del Examen
            </h3>

            {/* Leyenda Visual */}
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-md shadow-sm" />
                <span className="text-slate-600 font-medium">Respondida</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-amber-400 rounded-md shadow-sm" />
                <span className="text-slate-600 font-medium">Marcada</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-md" />
                <span className="text-slate-600 font-medium">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-slate-100 border border-slate-300 rounded-md" />
                <span className="text-slate-600 font-medium">Pendiente</span>
              </div>
            </div>

            {/* Píldoras Numeradas */}
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2.5 max-h-48 lg:max-h-[50vh] overflow-y-auto pr-2 pb-2 custom-scrollbar">
              {examen.preguntas.map((p, index) => {
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
                    className={`h-11 sm:h-12 w-full rounded-xl flex items-center justify-center text-sm transition-all duration-200 ${clasePildora(base, index === preguntaActualIdx)}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Botón Desktop "Terminar y Evaluar" */}
            <div className="hidden lg:block border-t border-slate-100 pt-5 mt-2">
              <button
                onClick={() => setMostrarConfirmacion(true)}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> Terminar y Evaluar
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
