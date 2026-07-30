'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';

interface OpcionItem {
  id: string;
  letra?: string;
  texto: string;
}

interface PreguntaDetalle {
  pregunta_id: string;
  numero_pregunta?: number;
  enunciado: string;
  contexto?: string;
  explicacion?: string;
  opcion_seleccionada_id?: string | null;
  alternativa_seleccionada_id?: string | null;
  opcion_correcta_id?: string | null;
  alternativa_correcta_id?: string | null;
  es_correcta: boolean;
  opciones?: OpcionItem[];
  alternativas?: OpcionItem[];
}

interface ResumenIntento {
  id?: string;
  examen_titulo?: string;
  puntaje?: number | string;
  puntaje_total?: number;
  puntaje_maximo?: number;
  porcentaje?: number;
  total_preguntas?: number;
  preguntas_correctas?: number;
  preguntas_incorrectas?: number;
  respuestas_correctas?: number;
  respuestas_incorrectas?: number;
  respuestas_omitidas?: number;
  aprobado?: boolean;
  fecha?: string;
  iniciado_en?: string;
  tiempo_empleado_segundos?: number;
}

export default function ResultadosPage({ params }: { params: Promise<{ evaluacion_id: string }> }) {
  const resolvedParams = use(params);
  const evaluacionId = resolvedParams.evaluacion_id;
  const router = useRouter();

  const [resumen, setResumen] = useState<ResumenIntento | null>(null);
  const [preguntas, setPreguntas] = useState<PreguntaDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'incorrectas' | 'correctas'>('todas');

  useEffect(() => {
    async function loadResultado() {
      try {
        const response: any = await fetchAPI(`/intentos/${evaluacionId}/resultados`);
        
        // Normalización si el backend devuelve array directo o { resumen, preguntas }
        if (Array.isArray(response)) {
          setPreguntas(response);
          setResumen({
            examen_titulo: 'Resultado del Simulacro',
            total_preguntas: response.length,
            preguntas_correctas: response.filter((p: any) => p.es_correcta).length,
            preguntas_incorrectas: response.filter((p: any) => !p.es_correcta).length,
          });
        } else {
          setResumen(response.resumen || response);
          setPreguntas(response.preguntas || response.detalles || []);
        }
      } catch (err: any) {
        console.error('Error al cargar resultado:', err);
        alert(err.error || 'No se pudo obtener la información de este examen.');
        router.push('/examenes');
      } finally {
        setLoading(false);
      }
    }
    loadResultado();
  }, [evaluacionId, router]);

  const formatTiempo = (segundos?: number) => {
    if (!segundos) return 'N/A';
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins}m ${segs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm">Cargando retroalimentación del simulacro...</p>
        </div>
      </div>
    );
  }

  const correctasCount = resumen?.preguntas_correctas ?? resumen?.respuestas_correctas ?? 0;
  const incorrectasCount = resumen?.preguntas_incorrectas ?? resumen?.respuestas_incorrectas ?? 0;

  const preguntasFiltradas = preguntas.filter((item) => {
    if (filtro === 'correctas') return item.es_correcta;
    if (filtro === 'incorrectas') return !item.es_correcta;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-16">
      
      {/* Top Header */}
      <header className="bg-slate-900 text-white py-6 px-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push('/examenes')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Volver a Mis Exámenes
          </button>
          <span className="text-xs font-medium text-slate-400">
            Intento ID: {evaluacionId.substring(0, 8)}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 -mt-4 space-y-6">
        
        {/* Banner Principal de Puntaje (Hero Card) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            <div className="space-y-2 text-center sm:text-left">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Simulacro Finalizado
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {resumen?.examen_titulo || 'Simulacro de Evaluación Docente'}
              </h1>
              {resumen?.fecha && (
                <p className="text-xs text-slate-500">
                  Completado el {new Date(resumen.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            {/* Badge de Calificación */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl min-w-[160px] bg-emerald-50 border border-emerald-200">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {resumen?.puntaje ?? 0}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-1">
                Puntaje Obtenido
              </span>
            </div>

          </div>

          {/* Grid de Métricas Secundarias */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-emerald-600">
                {correctasCount}
              </span>
              <span className="text-xs font-medium text-slate-500">Correctas</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-rose-600">
                {incorrectasCount}
              </span>
              <span className="text-xs font-medium text-slate-500">Incorrectas</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-amber-600">
                {resumen?.respuestas_omitidas ?? 0}
              </span>
              <span className="text-xs font-medium text-slate-500">Omitidas</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-slate-700">
                {formatTiempo(resumen?.tiempo_empleado_segundos)}
              </span>
              <span className="text-xs font-medium text-slate-500">Tiempo Usado</span>
            </div>
          </div>
        </div>

        {/* Sección de Retroalimentación Detallada */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">
              Retroalimentación Pedagógica Reactivo por Reactivo
            </h2>

            {/* Filtro de Preguntas */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setFiltro('todas')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtro === 'todas' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({preguntas.length})
              </button>
              <button
                onClick={() => setFiltro('incorrectas')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtro === 'incorrectas' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Incorrectas ({incorrectasCount})
              </button>
              <button
                onClick={() => setFiltro('correctas')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtro === 'correctas' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Correctas ({correctasCount})
              </button>
            </div>
          </div>

          {/* Lista de Preguntas Calificadas */}
          <div className="space-y-4">
            {preguntasFiltradas.map((item, idx) => {
              const opcionesList = item.opciones || item.alternativas || [];
              const seleccionadaId = item.opcion_seleccionada_id || item.alternativa_seleccionada_id;
              const correctaId = item.opcion_correcta_id || item.alternativa_correcta_id;

              return (
                <div
                  key={item.pregunta_id || idx}
                  className={`bg-white rounded-3xl p-6 shadow-sm border ${
                    item.es_correcta ? 'border-slate-200' : 'border-rose-200'
                  }`}
                >
                  {/* Header Pregunta */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-500">
                      Pregunta #{item.numero_pregunta || idx + 1}
                    </span>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        item.es_correcta
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.es_correcta ? '✓ Correcta' : '✗ Incorrecta / Omitida'}
                    </span>
                  </div>

                  {/* Contexto */}
                  {item.contexto && (
                    <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded-r-xl text-xs text-slate-700 leading-relaxed mb-4">
                      {item.contexto}
                    </div>
                  )}

                  {/* Enunciado */}
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-4">
                    {item.enunciado}
                  </h3>

                  {/* Alternativas */}
                  {opcionesList.length > 0 && (
                    <div className="space-y-2 mb-6">
                      {opcionesList.map((alt) => {
                        const fueSeleccionada = seleccionadaId === alt.id;
                        const esLaCorrecta = correctaId === alt.id;

                        let estiloAlt = 'border-slate-100 bg-slate-50 text-slate-600';

                        if (esLaCorrecta) {
                          estiloAlt = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-500';
                        } else if (fueSeleccionada && !esLaCorrecta) {
                          estiloAlt = 'border-rose-400 bg-rose-50 text-rose-950 line-through';
                        }

                        return (
                          <div
                            key={alt.id}
                            className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition-all ${estiloAlt}`}
                          >
                            <span className="font-bold shrink-0">{alt.letra || '•'}.</span>
                            <span className="flex-1">{alt.texto}</span>
                            {esLaCorrecta && <span className="font-bold text-emerald-700 shrink-0">✓ Opción Correcta</span>}
                            {fueSeleccionada && !esLaCorrecta && <span className="font-bold text-rose-600 shrink-0">Tu Selección</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Argumento Pedagógico / Sustento */}
                  {item.explicacion && item.explicacion.trim() !== '' && (
                    <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-2xl text-xs space-y-1">
                      <span className="font-bold text-blue-900 block uppercase tracking-wide">
                        💡 Sustento Pedagógico Oficial:
                      </span>
                      <p className="text-blue-950 leading-relaxed">
                        {item.explicacion}
                      </p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}