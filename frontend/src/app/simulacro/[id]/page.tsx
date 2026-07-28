'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';
import { ExamenDetalle, ResultadoEvaluacion } from '@/types';

export default function SimulacroPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examenId = resolvedParams.id;
  const router = useRouter();

  const [examen, setExamen] = useState<ExamenDetalle | null>(null);
  const [preguntaActualIdx, setPreguntaActualIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({}); // { pregunta_id: alternativa_id }
  const [tiempoRestante, setTiempoRestante] = useState<number>(0); // segundos
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // 1. Cargar datos del examen
  useEffect(() => {
    async function loadExamen() {
      try {
        const data = await fetchAPI<ExamenDetalle>(`/examenes/${examenId}`);
        setExamen(data);
        setTiempoRestante((data.duracion_minutos || 180) * 60);
      } catch (err: any) {
        console.error('Error al cargar examen:', err);
        alert(err.error || 'No tienes acceso a este simulacro.');
        router.push('/examenes');
      } finally {
        setLoading(false);
      }
    }
    loadExamen();
  }, [examenId, router]);

  // 2. Temporizador en vivo
  useEffect(() => {
    if (!examen || tiempoRestante <= 0) return;

    const timer = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizarSimulacro(); // Auto-envío al agotar tiempo
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examen, tiempoRestante]);

  // Formatear segundos a HH:MM:SS
  const formatTiempo = (segundosTotal: number) => {
    const horas = Math.floor(segundosTotal / 3600);
    const mins = Math.floor((segundosTotal % 3600) / 60);
    const segs = segundosTotal % 60;
    return `${horas > 0 ? `${horas}:` : ''}${mins < 10 ? '0' : ''}${mins}:${segs < 10 ? '0' : ''}${segs}`;
  };

  const seleccionarAlternativa = (preguntaId: string, alternativaId: string) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: alternativaId,
    }));
  };

  const finalizarSimulacro = async () => {
    if (!examen || submitting) return;
    setSubmitting(true);

    const duracionSegundosTotal = (examen.duracion_minutos || 180) * 60;
    const tiempoEmpleado = duracionSegundosTotal - tiempoRestante;

    const payload = {
      examen_id: examen.id,
      tiempo_empleado_segundos: tiempoEmpleado,
      respuestas: Object.entries(respuestas).map(([pregunta_id, alternativa_id]) => ({
        pregunta_id,
        alternativa_id,
      })),
    };

    try {
      const resultado = await fetchAPI<ResultadoEvaluacion>('/simulacro/finalizar', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Redirigir a la vista de resultados (Fase 8)
      router.push(`/resultados/${resultado.evaluacion_id}`);
    } catch (err: any) {
      console.error('Error al enviar examen:', err);
      alert('Ocurrió un error al enviar tus respuestas. Intenta nuevamente.');
      setSubmitting(false);
      setMostrarConfirmacion(false);
    }
  };

  if (loading || !examen) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm">Cargando simulacro en vivo...</p>
        </div>
      </div>
    );
  }

  const preguntaActual = examen.preguntas[preguntaActualIdx];
  const totalPreguntas = examen.preguntas.length;
  const respondidasCount = Object.keys(respuestas).length;
  const esUltimaPregunta = preguntaActualIdx === totalPreguntas - 1;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Topbar del Examen (Limpio y Fijo) */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/examenes')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Salir
            </button>
            <h1 className="text-sm sm:text-base font-bold truncate max-w-xs sm:max-w-md">
              {examen.titulo}
            </h1>
          </div>

          {/* Reloj Temporizador */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold transition-colors ${
              tiempoRestante < 300 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-blue-400'
            }`}
          >
            <span>⏱</span>
            <span>{formatTiempo(tiempoRestante)}</span>
          </div>
        </div>
      </header>

      {/* Cuerpo Principal (Split View) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* ÁREA DE LA PREGUNTA (3 columnas en PC) */}
        <main className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            
            {/* Header de Pregunta */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                Pregunta {preguntaActualIdx + 1} de {totalPreguntas}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Respondiendo {respondidasCount}/{totalPreguntas}
              </span>
            </div>

            {/* Contexto Pedagógico (si la pregunta lo incluye) */}
            {preguntaActual.contexto && (
              <div className="bg-amber-50/80 border-l-4 border-amber-400 p-4 rounded-r-2xl mb-6 text-slate-800 text-sm leading-relaxed">
                <p className="font-semibold text-amber-900 text-xs uppercase mb-1">Caso Pedagógico:</p>
                {preguntaActual.contexto}
              </div>
            )}

            {/* Enunciado */}
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug mb-6">
              {preguntaActual.enunciado}
            </h2>

            {/* Lista de Alternativas */}
            <div className="space-y-3">
              {preguntaActual.alternativas.map((alt) => {
                const seleccionada = respuestas[preguntaActual.id] === alt.id;

                return (
                  <button
                    key={alt.id}
                    onClick={() => seleccionarAlternativa(preguntaActual.id, alt.id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                      seleccionada
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        seleccionada
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {alt.letra}
                    </span>
                    <span className="text-sm text-slate-800 pt-0.5 leading-relaxed">
                      {alt.texto}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navegación Siguiente / Anterior */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setPreguntaActualIdx((prev) => Math.max(0, prev - 1))}
              disabled={preguntaActualIdx === 0}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              ← Anterior
            </button>

            {esUltimaPregunta ? (
              <button
                onClick={() => setMostrarConfirmacion(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                Finalizar y Enviar ✓
              </button>
            ) : (
              <button
                onClick={() => setPreguntaActualIdx((prev) => Math.min(totalPreguntas - 1, prev + 1))}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md transition-colors"
              >
                Siguiente →
              </button>
            )}
          </div>
        </main>

        {/* NAVEGADOR LATERAL DE PREGUNTAS (1 columna) */}
        <aside className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between h-fit space-y-6">
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-4">
              Navegador de Reactivos
            </h3>

            {/* Grid de Píldoras Numeradas */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
              {examen.preguntas.map((p, idx) => {
                const respondida = !!respuestas[p.id];
                const esActual = idx === preguntaActualIdx;

                return (
                  <button
                    key={p.id}
                    onClick={() => setPreguntaActualIdx(idx)}
                    className={`h-9 w-full rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                      esActual
                        ? 'ring-2 ring-blue-600 ring-offset-2 bg-blue-600 text-white'
                        : respondida
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <button
              onClick={() => setMostrarConfirmacion(true)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-2xl text-xs transition-colors shadow-sm"
            >
              Entregar Examen Ahora
            </button>
          </div>
        </aside>

      </div>

      {/* Modal de Confirmación para Entregar */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-xl mx-auto font-bold">
              📝
            </div>
            <h3 className="text-lg font-bold text-slate-900">¿Entregar Simulacro?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Has respondido <strong className="text-slate-800">{respondidasCount}</strong> de{' '}
              <strong className="text-slate-800">{totalPreguntas}</strong> preguntas.
              {respondidasCount < totalPreguntas && (
                <span className="block text-amber-700 font-semibold mt-1">
                  Atención: Tienes {totalPreguntas - respondidasCount} preguntas sin responder.
                </span>
              )}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
              >
                Seguir Practicando
              </button>
              <button
                onClick={finalizarSimulacro}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {submitting ? 'Calificando...' : 'Sí, Entregar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}