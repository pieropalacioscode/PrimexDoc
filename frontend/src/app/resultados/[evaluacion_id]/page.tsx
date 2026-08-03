'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchAPI } from '@/services/api';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Award,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Filter,
  Eye,
  EyeOff,
  Home,
} from 'lucide-react';

// ==========================================
// TIPOS
// ==========================================

interface OpcionResultado {
  id: string;
  etiqueta?: string;
  letra?: string;
  texto_opcion?: string;
  texto?: string;
  es_correcta?: boolean;
}

interface PreguntaResultado {
  pregunta_id?: string;
  id?: string;
  numero_pregunta?: number;
  orden?: number;
  enunciado?: string;
  texto_pregunta?: string;
  texto_base_id?: string | null;
  texto_base_titulo?: string;
  texto_base_contenido?: string;
  competencia?: string;
  explicacion?: string;
  sustento?: string;
  argumento?: string;
  opcion_seleccionada_id?: string | null;
  respuesta_usuario_id?: string | null;
  alternativa_seleccionada_id?: string | null;
  opcion_correcta_id?: string | null;
  alternativa_correcta_id?: string | null;
  es_correcta: boolean;
  opciones?: OpcionResultado[] | string;
  alternativas?: OpcionResultado[] | string;
}

interface ResumenIntento {
  id?: string;
  examen_id?: string;
  examen_titulo?: string;
  titulo?: string;
  puntaje?: number | string;
  porcentaje?: number;
  total_preguntas?: number;
  preguntas_correctas?: number;
  preguntas_incorrectas?: number;
  respuestas_omitidas?: number;
  tiempo_empleado_segundos?: unknown;
  duracion_minutos?: number;
  iniciado_en?: string;
  finalizado_en?: string;
}

interface ResultadoData {
  resumen: ResumenIntento;
  preguntas: PreguntaResultado[];
}

type Estado = 'correcta' | 'incorrecta' | 'omitida';

// ==========================================
// HELPERS
// ==========================================

function parseOpciones(raw: unknown): OpcionResultado[] {
  let opciones: OpcionResultado[] = [];
  if (Array.isArray(raw)) opciones = raw;
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      opciones = Array.isArray(parsed) ? parsed : [];
    } catch {
      opciones = [];
    }
  }
  return [...opciones].sort((a, b) =>
    (a.etiqueta || a.letra || '').toString().localeCompare((b.etiqueta || b.letra || '').toString())
  );
}

function numeroSeguro(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as any;
    if ('Valid' in obj) return obj.Valid ? Number(obj.Int32 ?? obj.Int64 ?? obj.Int ?? 0) : 0;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatTiempo(segundosTotal: number): string {
  const s = Math.max(0, Math.floor(segundosTotal));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`;
  return `${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`;
}

function respondioPregunta(p: PreguntaResultado): boolean {
  return Boolean(p.opcion_seleccionada_id || p.respuesta_usuario_id || p.alternativa_seleccionada_id);
}

function estadoPregunta(p: PreguntaResultado): Estado {
  if (!respondioPregunta(p)) return 'omitida';
  return p.es_correcta ? 'correcta' : 'incorrecta';
}

function claseBordeTarjeta(estado: Estado): string {
  if (estado === 'correcta') return 'border-emerald-200 hover:border-emerald-300';
  if (estado === 'incorrecta') return 'border-red-200 hover:border-red-300';
  return 'border-amber-200 hover:border-amber-300';
}

function badgeEstado(estado: Estado): { clase: string; Icono: typeof CheckCircle2; texto: string } {
  if (estado === 'correcta') return { clase: 'bg-emerald-100 text-emerald-800', Icono: CheckCircle2, texto: 'Correcta' };
  if (estado === 'incorrecta') return { clase: 'bg-red-100 text-red-800', Icono: XCircle, texto: 'Incorrecta' };
  return { clase: 'bg-amber-100 text-amber-800', Icono: AlertCircle, texto: 'Omitida' };
}

function colorPorcentaje(porcentaje: number): string {
  if (porcentaje >= 70) return 'text-emerald-600';
  if (porcentaje >= 50) return 'text-amber-600';
  return 'text-red-600';
}

// function resumenRendimiento(porcentaje: number): { Icono: typeof Award; texto: string; clase: string } {
//   if (porcentaje >= 85) return { Icono: Award, texto: 'Desempeño sobresaliente', clase: 'text-emerald-700' };
//   if (porcentaje >= 70) return { Icono: CheckCircle2, texto: 'Aprobado, buen trabajo', clase: 'text-emerald-700' };
//   if (porcentaje >= 50) return { Icono: TrendingUp, texto: 'Vas bien, sigue reforzando', clase: 'text-amber-600' };
//   return { Icono: TrendingDown, texto: 'Repasa las incorrectas', clase: 'text-red-600' };
// }

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function ResultadosPage({ params }: { params: Promise<{ evaluacion_id: string }> }) {
  const resolvedParams = use(params);
  const evaluacionId = resolvedParams.evaluacion_id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoData | null>(null);

  const [filtro, setFiltro] = useState<'todas' | Estado>('todas');
  const [textosExpandidos, setTextosExpandidos] = useState<{ [key: string]: boolean }>({});
  const [mostrarTodosTextos, setMostrarTodosTextos] = useState(true);
  const [mostrarScrollTop, setMostrarScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setMostrarScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    async function cargarResultado() {
      try {
        setLoading(true);
        setError(null);

        const response: any = await fetchAPI(`/intentos/${evaluacionId}/resultados`);

        let resumen: ResumenIntento;
        let preguntas: PreguntaResultado[];

        if (Array.isArray(response)) {
          preguntas = response;
          resumen = { total_preguntas: response.length };
        } else {
          resumen = response.resumen || response.intento || {};
          preguntas = response.preguntas || response.detalles || [];
        }

        let tiempoSegundos = numeroSeguro(resumen.tiempo_empleado_segundos);
        if (!tiempoSegundos && resumen.iniciado_en && resumen.finalizado_en) {
          const inicio = new Date(resumen.iniciado_en).getTime();
          const fin = new Date(resumen.finalizado_en).getTime();
          if (!Number.isNaN(inicio) && !Number.isNaN(fin) && fin > inicio) {
            tiempoSegundos = Math.floor((fin - inicio) / 1000);
          }
        }
        (resumen as any)._tiempoSegundosCalculado = tiempoSegundos;

// 1. Verificamos si falta la duración O si falta info en las preguntas
        const faltaDuracion = !resumen.duracion_minutos;
        const faltaInfoPreguntas = preguntas.some((p) => {
          const sinOpciones = parseOpciones(p.opciones ?? p.alternativas).length === 0;
          const faltaTextoBase = Boolean(p.texto_base_id) && !p.texto_base_contenido && !p.texto_base_titulo;
          return sinOpciones || faltaTextoBase;
        });

        // 2. Si falta CUALQUIERA de los dos, consultamos el examen original
        if ((faltaDuracion || faltaInfoPreguntas) && resumen.examen_id) {
          try {
            const examData: any = await fetchAPI(`/examenes/${resumen.examen_id}`);
            
            // Asignar la duración exacta desde la BD (180, 225, 270, etc.)
            if (examData?.duracion_minutos) {
              resumen.duracion_minutos = examData.duracion_minutos;
            }

            const preguntasExamen: any[] = examData?.preguntas || [];
            const textosBase: any[] = examData?.textos_base || [];

            preguntas = preguntas.map((p) => {
              const original = preguntasExamen.find((q: any) => q.id === p.pregunta_id || q.id === p.id);
              if (!original) return p;

              p.enunciado = p.enunciado || p.texto_pregunta || original.texto_pregunta || original.enunciado;
              p.competencia = p.competencia || original.competencia;

              if (parseOpciones(p.opciones ?? p.alternativas).length === 0) {
                const opsOriginales = parseOpciones(original.opciones ?? original.alternativas);
                if (opsOriginales.length > 0) p.opciones = opsOriginales;
              }

              const tbId = p.texto_base_id || original.texto_base_id;
              if (tbId && !p.texto_base_contenido && !p.texto_base_titulo) {
                const tb = textosBase.find((t: any) => t.id === tbId);
                if (tb) {
                  p.texto_base_titulo = tb.titulo;
                  p.texto_base_contenido = tb.contenido;
                }
              }
              return p;
            });
          } catch (e) {
            console.warn('No se pudo enriquecer resultados con datos del examen original:', e);
          }
        }
        setResultado({ resumen, preguntas });

        const iniciales: { [key: string]: boolean } = {};
        preguntas.forEach((p, idx) => {
          const pId = (p.pregunta_id || p.id || idx).toString();
          iniciales[pId] = Boolean(p.texto_base_contenido || p.texto_base_titulo);
        });
        setTextosExpandidos(iniciales);
      } catch (err: any) {
        console.error('Error al obtener resultados:', err);
        setError(err?.message || err?.error || 'No se pudieron cargar los resultados de la evaluación.');
      } finally {
        setLoading(false);
      }
    }

    if (evaluacionId) cargarResultado();
  }, [evaluacionId]);

  const toggleTextoBase = (id: string) => setTextosExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleTodosTextosBase = () => {
    const nuevoEstado = !mostrarTodosTextos;
    setMostrarTodosTextos(nuevoEstado);
    if (!resultado) return;
    const actualizados: { [key: string]: boolean } = {};
    resultado.preguntas.forEach((p, idx) => {
      const pId = (p.pregunta_id || p.id || idx).toString();
      if (p.texto_base_contenido || p.texto_base_titulo) actualizados[pId] = nuevoEstado;
    });
    setTextosExpandidos((prev) => ({ ...prev, ...actualizados }));
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-9 h-9 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium text-sm">Cargando retroalimentación del examen...</p>
        </div>
      </div>
    );
  }

  if (error || !resultado) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-sm border border-red-100 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Error al cargar resultados</h2>
          <p className="text-slate-600 text-sm mb-5">{error || 'No se encontró la evaluación solicitada.'}</p>
          <button
            onClick={() => router.push('/examenes')}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition"
          >
            Volver a Evaluaciones
          </button>
        </div>
      </div>
    );
  }

  const { resumen, preguntas } = resultado;
  const tituloEvaluacion = resumen.examen_titulo || resumen.titulo || 'Evaluación Docente';
  const totalPreguntas = resumen.total_preguntas || preguntas.length;

  const correctas = resumen.preguntas_correctas ?? preguntas.filter((p) => p.es_correcta).length;
  const omitidas = resumen.respuestas_omitidas ?? preguntas.filter((p) => !respondioPregunta(p)).length;
  const incorrectas = resumen.preguntas_incorrectas ?? totalPreguntas - correctas - omitidas;
  const porcentaje = resumen.porcentaje ?? Math.round((correctas / (totalPreguntas || 1)) * 100);
  // const rendimiento = resumenRendimiento(porcentaje);

  const tiempoSegundos = (resumen as any)._tiempoSegundosCalculado as number;
  const hayTiempoValido = tiempoSegundos > 0;
  
  // Leemos la duración real. Si por error extremo la BD no lo tiene, usamos 180 (3 horas) por seguridad.
  const duracionOficialMinutos = Number(resumen.duracion_minutos) > 0 ? Number(resumen.duracion_minutos) : 180;
  
  const diferenciaSegundos = (duracionOficialMinutos * 60) - tiempoSegundos;
  const sobroTiempo = diferenciaSegundos >= 0;

  const preguntasFiltradas = preguntas.filter((p) => filtro === 'todas' || estadoPregunta(p) === filtro);

  const pct = (n: number) => `${totalPreguntas ? (n / totalPreguntas) * 100 : 0}%`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 relative">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/examenes')}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 text-sm font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a Evaluaciones</span>
          </button>
          <span className="font-bold text-slate-800 text-sm truncate max-w-[220px] sm:max-w-md">{tituloEvaluacion}</span>
          <Link href="/examenes" className="p-2 text-slate-500 hover:text-blue-600 rounded-lg transition" title="Inicio">
            <Home className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <p className="text-xs text-slate-500">
              Intento ID: <span className="font-mono">{evaluacionId.substring(0, 8)}</span>
            </p>
            {/* <p className={`text-sm font-bold flex items-center gap-1.5 ${rendimiento.clase}`}>
              <rendimiento.Icono className="w-4 h-4" /> {rendimiento.texto}
            </p> */}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Tiempo Usado
              </span>
              <span className="text-xl font-extrabold text-slate-800 mt-2">
                {hayTiempoValido ? formatTiempo(tiempoSegundos) : 'No disponible'}
              </span>
              {hayTiempoValido && (
                <span className={`text-xs font-bold mt-1 flex items-center gap-1 ${sobroTiempo ? 'text-emerald-600' : 'text-red-600'}`}>
                  {sobroTiempo ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  {sobroTiempo ? `Ahorraste ${formatTiempo(diferenciaSegundos)}` : `Excediste ${formatTiempo(Math.abs(diferenciaSegundos))}`}
                </span>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between items-center text-center">
              <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Porcentaje
              </span>
              <span className={`text-2xl font-extrabold mt-2 ${colorPorcentaje(porcentaje)}`}>{porcentaje}%</span>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Correctas
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 mt-2">{correctas}</span>
            </div>

            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-red-800 uppercase flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Incorrectas
              </span>
              <span className="text-2xl font-extrabold text-red-700 mt-2">{incorrectas}</span>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Omitidas
              </span>
              <span className="text-2xl font-extrabold text-amber-700 mt-2">{omitidas}</span>
            </div>
          </div>

          {/* Barra de distribución animada */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div style={{ width: pct(correctas) }} className="bg-emerald-500 hover:bg-emerald-400 transition-all duration-500" title={`${correctas} correctas`} />
              <div style={{ width: pct(incorrectas) }} className="bg-red-500 hover:bg-red-400 transition-all duration-500" title={`${incorrectas} incorrectas`} />
              <div style={{ width: pct(omitidas) }} className="bg-amber-400 hover:bg-amber-300 transition-all duration-500" title={`${omitidas} omitidas`} />
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:flex items-center flex-shrink-0">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filtrar:
            </span>
            <button
              onClick={() => setFiltro('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 ${filtro === 'todas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Todas ({totalPreguntas})
            </button>
            <button
              onClick={() => setFiltro('incorrecta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 ${filtro === 'incorrecta' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
            >
              Incorrectas ({incorrectas})
            </button>
            <button
              onClick={() => setFiltro('correcta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 ${filtro === 'correcta' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
            >
              Correctas ({correctas})
            </button>
            {omitidas > 0 && (
              <button
                onClick={() => setFiltro('omitida')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition active:scale-95 ${filtro === 'omitida' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
              >
                Omitidas ({omitidas})
              </button>
            )}
          </div>

          <button
            onClick={toggleTodosTextosBase}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
          >
            {mostrarTodosTextos ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {mostrarTodosTextos ? 'Ocultar lecturas' : 'Mostrar lecturas'}
          </button>
        </div>

        <div className="space-y-4">
          {preguntasFiltradas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              No hay preguntas que coincidan con el filtro seleccionado.
            </div>
          ) : (
            preguntasFiltradas.map((pregunta, index) => {
              const preguntaId = (pregunta.pregunta_id || pregunta.id || index).toString();
              const numeroPregunta = pregunta.numero_pregunta || pregunta.orden || index + 1;
              const enunciadoTexto = pregunta.enunciado || pregunta.texto_pregunta || 'Sin enunciado';
              const opcionesList = parseOpciones(pregunta.opciones ?? pregunta.alternativas);
              const tieneLectura = Boolean(pregunta.texto_base_contenido || pregunta.texto_base_titulo);

              const estado = estadoPregunta(pregunta);
              const badge = badgeEstado(estado);

              const opcionUsuarioId =
                pregunta.opcion_seleccionada_id ?? pregunta.respuesta_usuario_id ?? pregunta.alternativa_seleccionada_id;
              const opcionCorrectaId =
                pregunta.opcion_correcta_id ?? pregunta.alternativa_correcta_id ?? opcionesList.find((o) => o.es_correcta)?.id;

              const estaExpandido = textosExpandidos[preguntaId] ?? true;

              return (
                <article key={preguntaId} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors ${claseBordeTarjeta(estado)}`}>
                  <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
                        N° {numeroPregunta}
                      </span>
                      {pregunta.competencia && (
                        <span className="hidden sm:inline-block px-2.5 py-1 bg-slate-200/70 text-slate-700 text-xs font-medium rounded-lg truncate max-w-[200px]">
                          {pregunta.competencia}
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${badge.clase}`}>
                      <badge.Icono className="w-3.5 h-3.5" /> {badge.texto}
                    </span>
                  </div>

                  <div className="p-4 sm:p-6 space-y-4">
                    {tieneLectura && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden">
                        <button
                          onClick={() => toggleTextoBase(preguntaId)}
                          className="w-full px-4 py-3 bg-blue-100/60 hover:bg-blue-100 text-blue-900 font-bold text-xs sm:text-sm flex items-center justify-between gap-2 transition text-left"
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" /> {pregunta.texto_base_titulo || 'Caso Pedagógico / Lectura'}
                          </span>
                          <span className="flex items-center gap-1 text-xs">
                            {estaExpandido ? (
                              <>Ocultar <ChevronUp className="w-4 h-4" /></>
                            ) : (
                              <>Leer caso <ChevronDown className="w-4 h-4" /></>
                            )}
                          </span>
                        </button>
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${estaExpandido ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="p-4 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-blue-200/60 bg-white/80 whitespace-pre-line">
                            {pregunta.texto_base_contenido}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-slate-900 font-medium text-sm sm:text-base leading-relaxed whitespace-pre-line">
                      {enunciadoTexto}
                    </div>

                    <div className="space-y-2">
                      {opcionesList.length > 0 ? (
                        opcionesList.map((opcion, idx) => {
                          const letra = opcion.etiqueta || opcion.letra || String.fromCharCode(65 + idx);
                          const textoOpcion = opcion.texto_opcion || opcion.texto || '';
                          const esSeleccionada = String(opcion.id) === String(opcionUsuarioId);
                          const esLaCorrecta = String(opcion.id) === String(opcionCorrectaId) || opcion.es_correcta === true;

                          let estilo = 'border-slate-200 bg-slate-50 text-slate-700';
                          if (esLaCorrecta) estilo = 'border-emerald-300 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-300';
                          else if (esSeleccionada) estilo = 'border-red-300 bg-red-50/80 text-red-950 ring-1 ring-red-300';

                          return (
                            <div key={opcion.id} className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm transition-colors ${estilo}`}>
                              <div className="flex items-start gap-3">
                                <span className="font-bold shrink-0">{letra}.</span>
                                <span className="leading-relaxed">{textoOpcion}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {esLaCorrecta && (
                                  <span className="text-emerald-700 font-bold text-xs inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" /> <span className="hidden sm:inline">Correcta</span>
                                  </span>
                                )}
                                {esSeleccionada && !esLaCorrecta && (
                                  <span className="text-red-700 font-bold text-xs inline-flex items-center gap-1">
                                    <XCircle className="w-4 h-4" /> <span className="hidden sm:inline">Tu selección</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          No se encontraron las alternativas de esta pregunta.
                        </div>
                      )}
                    </div>

                    {(pregunta.explicacion || pregunta.sustento || pregunta.argumento) && (
                      <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl text-xs sm:text-sm">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                          <Award className="w-4 h-4" /> Sustento Pedagógico:
                        </span>
                        <p className="text-amber-950 leading-relaxed whitespace-pre-line">
                          {pregunta.explicacion || pregunta.sustento || pregunta.argumento}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="pt-4 pb-10 flex justify-center">
          <button
            onClick={() => router.push('/examenes')}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a la Lista de Exámenes
          </button>
        </div>
      </main>

      {mostrarScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 p-3.5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all z-40"
          title="Volver arriba"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
