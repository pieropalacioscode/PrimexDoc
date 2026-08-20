//frontend > src > app > (dashboard) > resultados > [id] > page.tsx :
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/services/api";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Info,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Award,
  Filter,
} from "lucide-react";

// ============================================================
// TIPOS E INTERFACES
// ============================================================

export interface OpcionResultado {
  id: string;
  etiqueta: string;
  texto_opcion: string;
}

export interface DetallePregunta {
  pregunta_id: string;
  numero_pregunta: number;
  enunciado: string;
  texto_base_contenido?: string | null;
  explicacion?: string | null;
  sustento?: string | null;
  opcion_seleccionada_id?: string | null;
  opcion_correcta_id: string;
  es_correcta: boolean;
  opciones_json: OpcionResultado[];
  componente?: string | null;
}

export interface ResumenResultado {
  examen_titulo?: string;
  puntaje?: number;
  puntaje_maximo?: number;
  porcentaje?: number;
  total_preguntas?: number;
  preguntas_correctas?: number;
  preguntas_incorrectas?: number;
  respuestas_omitidas?: number;
  tiempo_empleado_segundos?: number;
}

// Punto de dominio por área temática (subprueba), tal como lo envía el backend
export interface AnaliticaData {
  area: string;
  porcentaje: number;
  correctas?: number;
  total?: number;
}

// Dominio por componente pedagógico específico
export interface ComponenteData {
  componente: string;
  aciertos: number;
  total: number;
  porcentaje: number;
}

// Respuesta completa del endpoint /analitica/intento/:id
export interface AnaliticaFullResponse {
  intento_id: string;
  subpruebas: AnaliticaData[];
  componentes: ComponenteData[];
  debilidades: string[];
  recomendacion: string;
}

// ============================================================
// COMPONENTE: RADAR DE DOMINIO (SVG puro, sin librerías externas)
// ============================================================

function RadarDominio({ data }: { data: AnaliticaData[] }) {
  // Si no hay datos, no mostramos nada
  if (!data || data.length === 0) return null;

  // Lógica Flexible: si hay pocos puntos, agregamos ejes fantasma (sin
  // etiqueta, en 0%) para que el SVG siempre pueda formar un polígono/telaraña.
  // - 1 punto -> agregamos 2 ejes fantasma (forma un triángulo)
  // - 2 puntos -> agregamos 1 eje fantasma
  let visualData = data;
  if (data.length === 1) {
    visualData = [
      ...data,
      { area: "", porcentaje: 0 },
      { area: "", porcentaje: 0 },
    ];
  } else if (data.length === 2) {
    visualData = [...data, { area: "", porcentaje: 0 }];
  }

  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 50;
  const niveles = 4; // anillos de fondo (25%, 50%, 75%, 100%)
  const angleStep = (Math.PI * 2) / visualData.length;

  const puntoEn = (indice: number, valorPorcentaje: number) => {
    const angulo = angleStep * indice - Math.PI / 2;
    const r = (valorPorcentaje / 100) * radius;
    return {
      x: center + r * Math.cos(angulo),
      y: center + r * Math.sin(angulo),
    };
  };

  const puntosPoligono = visualData
    .map((d, i) => {
      const p = puntoEn(i, d.porcentaje);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center justify-center w-full overflow-visible">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Anillos de fondo (Telaraña) */}
        {Array.from({ length: niveles }).map((_, nivel) => {
          const r = (radius / niveles) * (nivel + 1);
          const puntosAnillo = visualData
            .map((_, i) => {
              const angulo = angleStep * i - Math.PI / 2;
              return `${center + r * Math.cos(angulo)},${
                center + r * Math.sin(angulo)
              }`;
            })
            .join(" ");
          return (
            <polygon
              key={nivel}
              points={puntosAnillo}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          );
        })}

        {/* Ejes radiales */}
        {visualData.map((_, i) => {
          const p = puntoEn(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={visualData[i].area === "" ? "4 4" : "0"}
            />
          );
        })}

        {/* Área de Dominio (el gráfico real) */}
        <polygon
          points={puntosPoligono}
          fill="rgba(37, 99, 235, 0.2)"
          stroke="#2563eb"
          strokeWidth={3}
          strokeLinejoin="round"
        />

        {/* Etiquetas con manejo de texto largo */}
        {visualData.map((d, i) => {
          if (d.area === "") return null;
          const p = puntoEn(i, 115);
          return (
            <g key={i}>
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                className="fill-slate-600 font-bold"
                fontSize={10}
              >
                {d.area.length > 20 ? d.area.substring(0, 18) + "..." : d.area}
              </text>
              <text
                x={p.x}
                y={p.y + 12}
                textAnchor="middle"
                className="fill-blue-600 font-black"
                fontSize={11}
              >
                {Math.round(d.porcentaje)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ResultadoDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resumen, setResumen] = useState<ResumenResultado | null>(null);
  const [preguntas, setPreguntas] = useState<DetallePregunta[]>([]);

  // Analítica de dominio por componente (Radar + Semáforo)
  const [stats, setStats] = useState<AnaliticaFullResponse | null>(null);

  // Estados de UI / Filtros
  const [filtroEstado, setFiltroEstado] = useState<
    "todas" | "correctas" | "incorrectas" | "omitidas"
  >("todas");
  const [filtroComponente, setFiltroComponente] = useState<string>("TODOS");
  const [textosExpandidos, setTextosExpandidos] = useState<{
    [key: string]: boolean;
  }>({});

  // ============================================================
  // CARGAR DATOS DE LA API
  // ============================================================

  useEffect(() => {
    async function cargarResultado() {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // Petición al endpoint de resultados por intento ID
        const response: any = await fetchAPI(`/intentos/${id}/resultados`);

        // Extraer resumen y preguntas según la estructura del backend
        const rawPreguntas: DetallePregunta[] =
          response.preguntas || (Array.isArray(response) ? response : []);
        const rawResumen: ResumenResultado | null =
          response.resumen || (!Array.isArray(response) ? response : null);

        setPreguntas(rawPreguntas);
        setResumen(rawResumen);
      } catch (err: any) {
        console.error("Error cargando detalle:", err);
        setError("No se pudo cargar el detalle del examen. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    }

    cargarResultado();
  }, [id]);

  // Petición independiente al endpoint de analítica (no bloquea la vista principal)
  useEffect(() => {
    const cargarAnalitica = async () => {
      try {
        // fetchAPI ya maneja el Bearer Token automáticamente
        // El JSON del backend usa "subpruebas" (plural) y "componentes"
        const data = await fetchAPI<AnaliticaFullResponse>(
          `/analitica/intento/${params.id}`
        );
        console.log("Stats recibidas:", data);
        setStats(data);
      } catch (err) {
        console.error("Error cargando analítica:", err);
      }
    };
    cargarAnalitica();
  }, [params.id]);

  // Toggle de texto de apoyo individual
  const toggleTextoBase = (preguntaId: string) => {
    setTextosExpandidos((prev) => ({
      ...prev,
      [preguntaId]: !prev[preguntaId],
    }));
  };

  // Lista única de componentes presentes en las preguntas (para los chips)
  const componentesDisponibles = Array.from(
    new Set(
      preguntas
        .map((p) => p.componente)
        .filter((c): c is string => Boolean(c && c.trim().length > 0))
    )
  );

  // Filtrado dinámico de preguntas (estado + componente combinados)
  const preguntasFiltradas = preguntas.filter((item) => {
    // Filtro por estado (correcta / incorrecta / omitida)
    let pasaEstado = true;
    if (filtroEstado === "correctas") pasaEstado = item.es_correcta;
    else if (filtroEstado === "incorrectas")
      pasaEstado = !item.es_correcta && Boolean(item.opcion_seleccionada_id);
    else if (filtroEstado === "omitidas")
      pasaEstado = !item.opcion_seleccionada_id;

    // Filtro por componente / área temática
    const pasaComponente =
      filtroComponente === "TODOS" || item.componente === filtroComponente;

    return pasaEstado && pasaComponente;
  });

  // ============================================================
  // DATA PARA EL RADAR: decide qué usar para que el gráfico no se
  // vea vacío cuando el examen solo tiene 1 subprueba (ej. examen 2018)
  // Prioridad:
  // - Si hay >= 3 subpruebas, usamos subpruebas (mejor resumen).
  // - Si no, usamos componentes (suelen ser más y dan más forma al radar).
  // - Si solo hay 1 subprueba y pocos componentes, usamos subpruebas de
  //   todos modos; el RadarDominio flexible se encarga de rellenar ejes.
  // ============================================================

// 1. Detectar qué nivel de datos estamos usando para informar al usuario
  const usaComponentesParaRadar = useMemo(() => {
    const tieneSuficientesSubpruebas = (stats?.subpruebas?.length || 0) >= 3;
    const tieneSuficientesComponentes = (stats?.componentes?.length || 0) >= 3;
    
    return !tieneSuficientesSubpruebas && tieneSuficientesComponentes;
  }, [stats]);

  // 2. Procesar la data para el Radar
  const radarData = useMemo(() => {
    if (!stats) return [];

    // CASO A: 3 o más subpruebas (Vista ideal por Áreas)
    if (stats.subpruebas && stats.subpruebas.length >= 3) {
      return stats.subpruebas.map((s) => ({
        area: s.area,
        porcentaje: s.porcentaje,
      }));
    }

    // CASO B: Pocas subpruebas, pero suficientes componentes (Vista por Temas)
    // Esto arregla el caso del examen 2018 que mencionaste.
    if (stats.componentes && stats.componentes.length >= 3) {
      return stats.componentes.map((c) => ({
        area: c.componente, // Aquí usamos el nombre del componente como eje
        porcentaje: c.porcentaje,
      }));
    }

    // CASO C: Muy poca data en ambos (1 o 2 puntos)
    // Usamos subpruebas y el RadarFlexible pondrá los ejes vacíos.
    return (stats.subpruebas || []).map((s) => ({
      area: s.area,
      porcentaje: s.porcentaje,
    }));
  }, [stats]);
    // ============================================================
  // ESTADO DE CARGA
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="font-medium text-slate-600">
            Cargando el desglose de tu examen...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADO DE ERROR
  // ============================================================

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-800">
            Error de conexión
          </h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => router.push("/resultados")}
            className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800"
          >
            Volver a Mis Resultados
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // VISTA PRINCIPAL
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* ======================================================
          HEADER STICKY
      ====================================================== */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/resultados"
            className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            Volver
          </Link>

          <Link
            href={`/resultados/${id}/analitica`}
            className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-100 transition-transform hover:bg-blue-800 active:scale-95"
          >
            <BarChart3 size={16} className="text-cyan-400" />
            DIAGNÓSTICO PRO
          </Link>
        </div>
      </header>

      {/* ======================================================
          CONTENIDO PRINCIPAL
      ====================================================== */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* TITULO */}
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">
            Revisión de Examen
          </h1>
          <p className="mt-1 text-slate-500">
            Analiza tus respuestas y revisa la explicación pedagógica de cada
            pregunta.
          </p>
        </header>

        {/* ====================================================
            RESUMEN / TARJETAS DE MÉTRICAS (SI EXISTE RESUMEN)
        ==================================================== */}
        {resumen && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Award size={18} className="text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Puntaje
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {resumen.puntaje ?? 0}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {resumen.puntaje_maximo ?? 100}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Target size={18} className="text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Aciertos
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-emerald-600">
                {resumen.preguntas_correctas ?? 0}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {resumen.total_preguntas ?? preguntas.length}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <XCircle size={18} className="text-rose-500" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Incorrectas
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-rose-600">
                {resumen.preguntas_incorrectas ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={18} className="text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Tiempo
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-800">
                {resumen.tiempo_empleado_segundos
                  ? `${Math.floor(resumen.tiempo_empleado_segundos / 60)}m`
                  : "N/A"}
              </p>
            </div>
          </div>
        )}

        {/* ====================================================
            PANEL DE ANALÍTICA
            (usa los nombres reales que envía el backend:
             subpruebas / componentes)
        ==================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* COLUMNA 1: RADAR INTELIGENTE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-2">Dominio de Capacidades</h2>
            
            {/* Subtítulo dinámico que explica la data al docente */}
            {stats && (
              <p className="text-[10px] text-blue-600 mb-4 uppercase font-bold tracking-widest animate-in fade-in duration-500">
                {usaComponentesParaRadar
                  ? "Análisis por Componentes Temáticos"
                  : "Equilibrio por Subpruebas Generales"}
              </p>
            )}

            {!stats ? (
              <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <p>Generando analítica avanzada...</p>
              </div>
            ) : radarData.length > 0 ? (
              /* Este componente ahora recibe la data filtrada por la lógica del useMemo */
              <div className="flex h-64 items-center justify-center">
                <RadarDominio data={radarData} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <p className="text-sm italic">No hay datos suficientes para el mapa de calor.</p>
              </div>
            )}
          </div>

          {/* COLUMNA 2: SEMÁFORO DE DEBILIDADES POR COMPONENTE */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold mb-4">Diagnóstico Smart</h2>
            {stats?.componentes && stats.componentes.length > 0 ? (
              <div className="space-y-3">
                {stats.componentes.map((c) => (
                  <div
                    key={c.componente}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {c.componente}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        {c.aciertos} de {c.total} aciertos
                      </p>
                    </div>
                    <div
                      className={`text-sm font-black ${
                        c.porcentaje < 50 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {Math.round(c.porcentaje)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-10">
                Aún no hay datos suficientes para el diagnóstico.
              </p>
            )}
          </div>
        </div>

        {/* ====================================================
            BARRA DE FILTROS DE PREGUNTAS (ESTADO)
        ==================================================== */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Filter size={18} className="text-slate-400" />
            <span>Filtrar por:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["todas", "correctas", "incorrectas", "omitidas"] as const).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFiltroEstado(f)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all ${
                    filtroEstado === f
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {f}
                </button>
              )
            )}
          </div>
        </div>

        {/* ====================================================
            BARRA DE FILTROS POR COMPONENTE / ÁREA TEMÁTICA
            (Solo se muestra si el backend envía el campo `componente`)
        ==================================================== */}
        {componentesDisponibles.length > 0 && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFiltroComponente("TODOS")}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                filtroComponente === "TODOS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos los componentes
            </button>
            {componentesDisponibles.map((c) => (
              <button
                key={c}
                onClick={() => setFiltroComponente(c)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  filtroComponente === c
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* ====================================================
            LISTA DE PREGUNTAS
        ==================================================== */}
        {preguntasFiltradas.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Info size={40} className="mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-black text-slate-800">
              Sin coincidencias
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              No encontramos preguntas asociadas al filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            {preguntasFiltradas.map((item) => {
              const estaExpandidoTexto =
                textosExpandidos[item.pregunta_id] ?? true;
              const explicacionTexto = item.explicacion || item.sustento;

              return (
                <article
                  key={item.pregunta_id}
                  className={`overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition-all ${
                    item.es_correcta
                      ? "border-emerald-100"
                      : "border-rose-100"
                  }`}
                >
                  {/* INDICADOR DE ESTADO EN CABECERA DE PREGUNTA */}
                  <div
                    className={`flex items-center justify-between px-6 py-3 ${
                      item.es_correcta
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest">
                        Pregunta {item.numero_pregunta}
                      </span>
                      {item.componente && (
                        <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {item.componente}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold">
                      {item.es_correcta ? (
                        <>
                          <CheckCircle2 size={18} />
                          ¡Logrado!
                        </>
                      ) : (
                        <>
                          <XCircle size={18} />
                          Por mejorar
                        </>
                      )}
                    </div>
                  </div>

                  {/* CUERPO DE LA PREGUNTA */}
                  <div className="p-6 sm:p-8">
                    {/* TEXTO DE APOYO / LECTURA BASE (ACORDEÓN) */}
                    {item.texto_base_contenido && (
                      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => toggleTextoBase(item.pregunta_id)}
                          className="flex w-full items-center justify-between p-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100/80"
                        >
                          <span>Texto Base de Consulta</span>
                          {estaExpandidoTexto ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>

                        {estaExpandidoTexto && (
                          <div className="border-t border-slate-200 p-5 text-sm italic leading-relaxed text-slate-600">
                            {item.texto_base_contenido}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ENUNCIADO DE LA PREGUNTA */}
                    <p className="mb-6 text-lg font-bold leading-relaxed text-slate-800">
                      {item.enunciado}
                    </p>

                    {/* ALTERNATIVAS */}
                    <div className="mb-8 grid gap-3">
                      {item.opciones_json?.map((op) => {
                        const esLaQueMarco =
                          op.id === item.opcion_seleccionada_id;
                        const esLaCorrecta = op.id === item.opcion_correcta_id;

                        let cardStyles =
                          "border-slate-100 text-slate-500 bg-white";
                        let badgeStyles = "bg-slate-100 text-slate-400";

                        if (esLaCorrecta) {
                          cardStyles =
                            "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500";
                          badgeStyles = "bg-emerald-500 text-white";
                        } else if (esLaQueMarco) {
                          cardStyles =
                            "border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500";
                          badgeStyles = "bg-rose-500 text-white";
                        }

                        return (
                          <div
                            key={op.id}
                            className={`flex items-start gap-4 rounded-2xl border-2 p-4 transition-all ${cardStyles}`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${badgeStyles}`}
                            >
                              {op.etiqueta}
                            </span>

                            <span className="flex-1 text-sm font-semibold sm:text-base">
                              {op.texto_opcion}
                            </span>

                            {esLaCorrecta && (
                              <CheckCircle2
                                size={20}
                                className="shrink-0 text-emerald-600"
                              />
                            )}

                            {esLaQueMarco && !esLaCorrecta && (
                              <XCircle
                                size={20}
                                className="shrink-0 text-rose-600"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* RETROALIMENTACIÓN / SUSTENTO PEDAGÓGICO */}
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-6">
                      <div className="mb-2 flex items-center gap-2 font-bold text-blue-900">
                        <BookOpen size={18} className="text-blue-700" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          Sustento Pedagógico & Retroalimentación:
                        </span>
                      </div>

                      <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-blue-950/80 sm:text-base">
                        {explicacionTexto ||
                          "El sustento pedagógico para esta pregunta estará disponible pronto."}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}