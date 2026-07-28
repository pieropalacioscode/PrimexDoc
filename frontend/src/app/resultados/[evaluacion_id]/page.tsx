'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';
import { ResultadoDetallado } from '@/types';

export default function ResultadosPage({ params }: { params: Promise<{ evaluacion_id: string }> }) {
  const resolvedParams = use(params);
  const evaluacionId = resolvedParams.evaluacion_id;
  const router = useRouter();

  const [resultado, setResultado] = useState<ResultadoDetallado | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'incorrectas' | 'correctas'>('todas');

  useEffect(() => {
    async function loadResultado() {
      try {
        const data = await fetchAPI<ResultadoDetallado>(`/simulacro/resultados/${evaluacionId}`);
        setResultado(data);
      } catch (err: any) {
        console.error('Error al cargar resultado:', err);
        alert(err.error || 'No se pudo obtener la información de este examen.');
        router.push('/examenes');
      } flexy {
        setLoading(false);
      }
    }
    loadResultado();
  }, [evaluacionId, router]);

  const formatTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins}m ${segs}s`;
  };

  if (loading || !resultado) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm">Calculando tu puntaje y retroalimentación...</p>
        </div>
      </div>
    );
  }

  const preguntasFiltradas = resultado.detalles.filter((item) => {
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
            Evaluación ID: {evaluacionId.substring(0, 8)}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 -mt-4 space-y-6">
        
        {/* Banner Principal de Puntaje (Hero Card) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            <div className="space-y-2 text-center sm:text-left">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                resultado.aprobado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {resultado.aprobado ? 'Satisfactorio (Aprobado)' : 'En Proceso de Mejora'}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {resultado.examen_titulo}
              </h1>
              <p className="text-xs text-slate-500">
                Completado el {new Date(resultado.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Círculo / Badge de Calificación */}
            <div className={`flex flex-col items-center justify-center p-6 rounded-3xl min-w-[160px] ${
              resultado.aprobado ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'
            }`}>
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                {resultado.puntaje_total}
              </span>
              <span className="text-xs font-semibold text-slate-500 mt-1">
                de {resultado.puntaje_maximo} ptos. ({resultado.porcentaje}%)
              </span>
            </div>

          </div>

          {/* Grid de Métricas Secundarias */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-emerald-600">
                {resultado.respuestas_correctas}
              </span>
              <span className="text-xs font-medium text-slate-500">Correctas</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-rose-600">
                {resultado.respuestas_incorrectas}
              </span>
              <span className="text-xs font-medium text-slate-500">Incorrectas</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-amber-600">
                {resultado.respuestas_omitidas}
              </span>
              <span className="text-xs font-medium text-slate-500">Omitidas</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
              <span className="block text-xl font-bold text-slate-700">
                {formatTiempo(resultado.tiempo_empleado_segundos)}
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
                Todas ({resultado.detalles.length})
              </button>
              <button
                onClick={() => setFiltro('incorrectas')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtro === 'incorrectas' ? 'bg-rose-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Incorrectas ({resultado.respuestas_incorrectas + resultado.respuestas_omitidas})
              </button>
              <button
                onClick={() => setFiltro('correctas')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  filtro === 'correctas' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Correctas ({resultado.respuestas_correctas})
              </button>
            </div>
          </div>

          {/* Lista de Preguntas Calificadas */}
          <div className="space-y-4">
            {preguntasFiltradas.map((item, idx) => (
              <div
                key={item.pregunta_id}
                className={`bg-white rounded-3xl p-6 shadow-sm border ${
                  item.es_correcta ? 'border-slate-200' : 'border-rose-200'
                }`}
              >
                {/* Header Pregunta */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500">
                    Pregunta #{idx + 1}
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

                {/* Caso / Contexto */}
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
                <div className="space-y-2 mb-6">
                  {item.alternativas.map((alt) => {
                    const fueSeleccionada = item.alternativa_seleccionada_id === alt.id;
                    const esLaCorrecta = item.alternativa_correcta_id === alt.id;

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
                        <span className="font-bold shrink-0">{alt.letra}.</span>
                        <span className="flex-1">{alt.texto}</span>
                        {esLaCorrecta && <span className="font-bold text-emerald-700 shrink-0">✓ Opción Correcta</span>}
                        {fueSeleccionada && !esLaCorrecta && <span className="font-bold text-rose-600 shrink-0">Tu Selección</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Argumento Pedagógico / Sustento */}
                {item.explicacion && (
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
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}