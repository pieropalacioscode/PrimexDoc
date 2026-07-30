'use client';
import { Opcion, ExamenDetalle } from '@/types';
import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';

export default function SimulacroPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const examenId = resolvedParams.id;
  const router = useRouter();

  // ==========================================
  // ESTADOS DEL EXAMEN
  // ==========================================
  const [examen, setExamen] = useState<ExamenDetalle | null>(null);
  const [intentoId, setIntentoId] = useState<string | null>(null);
  const [preguntaActualIdx, setPreguntaActualIdx] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  
  // ==========================================
  // ESTADOS DE TIEMPO Y CONTROLES (NUEVO)
  // ==========================================
  const [tiempoRestante, setTiempoRestante] = useState<number>(0);
  const [esPausado, setEsPausado] = useState<boolean>(false);
  const [preguntasMarcadas, setPreguntasMarcadas] = useState<Set<string>>(new Set());

  // Estados de Interfaz
  const [mostrarTextoBase, setMostrarTextoBase] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // ==========================================
  // 1. INICIALIZACIÓN
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

        const intentoRes = await fetchAPI<{ id: string }>('/intentos', {
          method: 'POST',
          body: JSON.stringify({ examen_id: examenId, modo: 'simulacro' }),
        });

        if (intentoRes?.id) setIntentoId(intentoRes.id);
      } catch (err: any) {
        console.error('Error al inicializar simulacro:', err);
        alert(err?.error || 'No tienes acceso a este simulacro o falló el inicio.');
        router.push('/examenes');
      } finally {
        setLoading(false);
      }
    }
    initSimulacro();
  }, [examenId, router]);

  // ==========================================
  // 2. TEMPORIZADOR CON SOPORTE PARA PAUSA
  // ==========================================
  useEffect(() => {
    if (tiempoRestante <= 0 || esPausado || loading) return;

    const interval = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finalizarSimulacro(); // Auto-envío
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tiempoRestante, esPausado, loading]);

  // ==========================================
  // 3. LÓGICA DE LECTURAS (AGRUPACIÓN)
  // ==========================================
  useEffect(() => {
    if (!examen || !examen.preguntas || examen.preguntas.length === 0) return;
    const pregActual = examen.preguntas[preguntaActualIdx];
    
    if (!pregActual || !pregActual.texto_base_id) {
      setMostrarTextoBase(false);
      return;
    }

    const pregAnterior = preguntaActualIdx > 0 ? examen.preguntas[preguntaActualIdx - 1] : null;
    if (pregAnterior && pregAnterior.texto_base_id === pregActual.texto_base_id) {
      setMostrarTextoBase(false);
    } else {
      setMostrarTextoBase(true);
    }
  }, [preguntaActualIdx, examen]);

  // ==========================================
  // 4. FUNCIONES AUXILIARES
  // ==========================================
  const formatTiempo = (segundosTotal: number) => {
    const horas = Math.floor(segundosTotal / 3600);
    const mins = Math.floor((segundosTotal % 3600) / 60);
    const segs = segundosTotal % 60;
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  const seleccionarAlternativa = (preguntaId: string, alternativaId: string) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: alternativaId }));
  };

  const toggleMarcarPregunta = (preguntaId: string) => {
    setPreguntasMarcadas((prev) => {
      const nuevoSet = new Set(prev);
      nuevoSet.has(preguntaId) ? nuevoSet.delete(preguntaId) : nuevoSet.add(preguntaId);
      return nuevoSet;
    });
  };

  const finalizarSimulacro = async () => {
    if (!examen || !intentoId || submitting) return;
    setSubmitting(true);

    const duracionSegundosTotal = (examen.duracion_minutos || 180) * 60;
    const tiempoEmpleado = Math.max(0, duracionSegundosTotal - tiempoRestante);

    const payload = {
      tiempo_empleado_segundos: tiempoEmpleado,
      respuestas: Object.entries(respuestas).map(([pregunta_id, opcion_id]) => ({
        pregunta_id,
        opcion_seleccionada_id: opcion_id,
      })),
    };

    try {
      await fetchAPI(`/intentos/${intentoId}/finalizar`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push(`/resultados/${intentoId}`);
    } catch (err: any) {
      console.error('Error al enviar examen:', err);
      alert(err?.error || 'Ocurrió un error al enviar tus respuestas.');
      setSubmitting(false);
      setMostrarConfirmacion(false);
    }
  };

  // ==========================================
  // RENDER: PANTALLA DE CARGA
  // ==========================================
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

  // Variables derivadas
  const preguntaActual = examen.preguntas[preguntaActualIdx];
  const totalPreguntas = examen.preguntas.length;
  const respondidasCount = Object.keys(respuestas).length;
  const esUltimaPregunta = preguntaActualIdx === totalPreguntas - 1;
  const textoBaseActual = examen.textos_base?.find((tb) => tb.id === preguntaActual?.texto_base_id);

  // ==========================================
  // RENDER: INTERFAZ PRINCIPAL
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* OVERLAY DE PAUSA */}
      {esPausado && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex flex-col items-center justify-center text-white p-4 transition-all">
          <div className="bg-white text-slate-800 p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <span className="text-5xl mb-4 block">⏸️</span>
            <h2 className="text-2xl font-extrabold mb-2">Simulacro Pausado</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              El tiempo y el examen se han detenido. Haz clic en reanudar cuando estés listo para continuar.
            </p>
            <button
              onClick={() => setEsPausado(false)}
              className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              ▶️ Reanudar Prueba
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              📝
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">¿Entregar Simulacro?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Has respondido <strong className="text-slate-800">{respondidasCount}</strong> de <strong className="text-slate-800">{totalPreguntas}</strong> preguntas.
              {respondidasCount < totalPreguntas && (
                <span className="block text-amber-600 font-bold mt-2 bg-amber-50 p-2 rounded-lg">
                  ⚠️ Faltan {totalPreguntas - respondidasCount} preguntas sin responder.
                </span>
              )}
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-4">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                disabled={submitting}
                className="w-full sm:flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                Revisar más
              </button>
              <button
                onClick={finalizarSimulacro}
                disabled={submitting}
                className="w-full sm:flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-200 disabled:opacity-50 transition-all flex justify-center items-center"
              >
                {submitting ? 'Enviando...' : 'Sí, Entregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR / HEADER RESPONSIVO */}
      <header className="bg-white sticky top-0 z-40 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-y-3">
          
          {/* Lado Izquierdo: Salir y Título */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/examenes')}
              className="text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 sm:px-3 sm:py-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-semibold"
            >
              <span>←</span>
              <span className="hidden sm:inline">Salir</span>
            </button>
            <h1 className="text-sm md:text-base font-extrabold text-slate-800 truncate max-w-[200px] md:max-w-md">
              {examen.titulo}
            </h1>
          </div>

          {/* Lado Derecho: Reloj y Controles */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Reloj */}
            <div className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-mono text-sm sm:text-base font-bold transition-colors ${
                tiempoRestante < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-900 text-white shadow-md'
              }`}
            >
              <span>⏱</span>
              <span>{formatTiempo(tiempoRestante)}</span>
            </div>

            {/* Controles: Pausa y Marcar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEsPausado(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-white border-2 border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                title="Pausar simulacro"
              >
                <span>⏸️</span>
                <span className="hidden lg:inline">Pausar</span>
              </button>
              
              <button
                onClick={() => toggleMarcarPregunta(preguntaActual.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-2 rounded-xl transition-all ${
                  preguntasMarcadas.has(preguntaActual.id)
                    ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-inner'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
                title="Marcar pregunta para revisión posterior"
              >
                <span>🔖</span>
                <span className="hidden lg:inline">
                  {preguntasMarcadas.has(preguntaActual.id) ? 'Marcada' : 'Marcar'}
                </span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* CUERPO PRINCIPAL (GRID RESPONSIVO) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* ÁREA DE LA PREGUNTA (Ocupa 8 columnas en Desktop) */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-200">
            
            {/* Header de Pregunta Actual */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <span className="text-xs sm:text-sm font-extrabold text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                Pregunta {preguntaActualIdx + 1} de {totalPreguntas}
              </span>
              <span className="text-xs sm:text-sm text-slate-500 font-semibold bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                Resueltas {respondidasCount}/{totalPreguntas}
              </span>
            </div>

            {/* BLOQUE DE TEXTO BASE / LECTURA */}
            {textoBaseActual && (
              <div className="mb-8 rounded-2xl border-2 border-blue-100 bg-blue-50/50 overflow-hidden transition-all">
                <div className="p-3 sm:p-4 bg-white border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm truncate pr-2">
                    <span>📖</span>
                    <span className="truncate">{textoBaseActual.titulo || 'Caso Pedagógico / Lectura'}</span>
                  </div>
                  <button
                    onClick={() => setMostrarTextoBase((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all shrink-0"
                  >
                    {mostrarTextoBase ? '🔼 Ocultar' : '📖 Leer Caso'}
                  </button>
                </div>
                {mostrarTextoBase && (
                  <div className="p-5 sm:p-6 text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line max-h-[40vh] overflow-y-auto">
                    {textoBaseActual.contenido}
                  </div>
                )}
              </div>
            )}

            {/* Imagen opcional */}
            {preguntaActual.url_imagen && (
              <div className="mb-6 flex justify-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <img
                  src={preguntaActual.url_imagen}
                  alt="Recurso de la pregunta"
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
              {((preguntaActual?.opciones || preguntaActual?.alternativas || []) as Opcion[]).map((alt) => {
                const seleccionada = respuestas[preguntaActual.id] === alt.id;
                const etiqueta = alt.etiqueta || alt.letra || '•';
                const textoOpcion = alt.texto_opcion || alt.texto;

                return (
                  <button
                    key={alt.id}
                    onClick={() => seleccionarAlternativa(preguntaActual.id, alt.id)}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-start gap-4 sm:gap-5 group ${
                      seleccionada
                        ? 'border-blue-600 bg-blue-50/80 shadow-md ring-4 ring-blue-600/10'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 bg-white shadow-sm'
                    }`}
                  >
                    <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 transition-colors ${
                        seleccionada
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}
                    >
                      {etiqueta}
                    </span>
                    <span className={`text-sm sm:text-base pt-1 sm:pt-2 leading-relaxed ${seleccionada ? 'text-blue-950 font-medium' : 'text-slate-700'}`}>
                      {textoOpcion}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navegación Anterior/Siguiente */}
          <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setPreguntaActualIdx((prev) => Math.max(0, prev - 1))}
              disabled={preguntaActualIdx === 0}
              className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:hover:bg-transparent"
            >
              ← <span className="hidden sm:inline">Anterior</span>
            </button>

            {esUltimaPregunta ? (
              <button
                onClick={() => setMostrarConfirmacion(true)}
                className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95"
              >
                Finalizar ✓
              </button>
            ) : (
              <button
                onClick={() => setPreguntaActualIdx((prev) => Math.min(totalPreguntas - 1, prev + 1))}
                className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                <span className="hidden sm:inline">Siguiente</span> →
              </button>
            )}
          </div>
        </main>

        {/* SIDEBAR LEYENDA Y GRID (Ocupa 4 columnas en Desktop) */}
        <aside className="lg:col-span-4 xl:col-span-3 order-first lg:order-last mb-6 lg:mb-0 lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col space-y-6">
            
            <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <span>🗂️</span> Mapa del Examen
            </h3>

            {/* Leyenda Visual Mejorada */}
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-md shadow-sm"></span>
                <span className="text-slate-600 font-medium">Respondida</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-amber-400 rounded-md shadow-sm"></span>
                <span className="text-slate-600 font-medium">Marcada</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-md"></span>
                <span className="text-slate-600 font-medium">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-slate-100 border border-slate-300 rounded-md"></span>
                <span className="text-slate-600 font-medium">Pendiente</span>
              </div>
            </div>

            {/* Grid de Píldoras Numeradas */}
            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2.5 max-h-48 lg:max-h-[50vh] overflow-y-auto pr-2 pb-2 custom-scrollbar">
              {examen.preguntas.map((p, index) => {
                const esRespondida = Boolean(respuestas[p.id]);
                const esMarcada = preguntasMarcadas.has(p.id);
                const esActual = index === preguntaActualIdx;

                // Lógica de estilos por prioridad
                let styleClass = 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'; // Pendiente (Por defecto)
                if (esRespondida) styleClass = 'bg-emerald-500 text-white border-transparent font-bold shadow-sm';
                if (esMarcada) styleClass = 'bg-amber-400 text-amber-950 border-transparent font-extrabold shadow-sm';
                if (esActual) styleClass += ' ring-4 ring-blue-600/30 border-blue-600 !scale-110 z-10 font-black'; // El actual sobreescribe border/ring

                return (
                  <button
                    key={p.id}
                    onClick={() => setPreguntaActualIdx(index)}
                    className={`h-11 sm:h-12 w-full rounded-xl flex items-center justify-center text-sm transition-all duration-200 ${styleClass}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            {/* Botón Inferior para Entregar (Solo visible en Desktop, en móvil molesta menos si usan el botón del flujo normal) */}
            <div className="hidden lg:block border-t border-slate-100 pt-5 mt-2">
              <button
                onClick={() => setMostrarConfirmacion(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl text-sm transition-colors shadow-lg"
              >
                Terminar y Evaluar
              </button>
            </div>

          </div>
        </aside>
      </div>
    </div>
  );
}