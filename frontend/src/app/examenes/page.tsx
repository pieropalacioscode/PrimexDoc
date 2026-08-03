'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/services/api';
import { ExamenCompleto, EstadoSuscripcion } from '@/types'; // Importamos ExamenCompleto centralizado
import PaywallModal from '@/components/PaywallModal';

export default function ExamenesPage() {
  const { user, logout } = useAuth();
  const [examenes, setExamenes] = useState<ExamenCompleto[]>([]);
  const [suscripcion, setSuscripcion] = useState<EstadoSuscripcion | null>(null);
  const [filtroArea, setFiltroArea] = useState<string>('Todos');
  const [loading, setLoading] = useState(true);

  // Estado para controlar qué tarjetas tienen desplegada la descripción
  const [descripcionesAbiertas, setDescripcionesAbiertas] = useState<Record<string, boolean>>({});

  // Estado para el Modal Paywall
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamenTitulo, setSelectedExamenTitulo] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const [dataExamenes, dataSub] = await Promise.all([
          fetchAPI<ExamenCompleto[]>('/examenes'),
          fetchAPI<EstadoSuscripcion>('/me/suscripcion').catch(() => ({
            tiene_acceso: false,
          })),
        ]);

        setExamenes(dataExamenes);
        setSuscripcion(dataSub);
      } catch (err) {
        console.error('Error al cargar catálogo:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);
  const areas = ['Todos', 'Inicial', 'Primaria', 'Secundaria', 'General'];

  // Lógica de filtrado flexible (compara nivel, area o titulo)
  const examenesFiltrados = examenes.filter((ex) => {
    if (filtroArea === 'Todos') return true;
    const filtro = filtroArea.toLowerCase();
    const nivel = (ex.nivel || '').toLowerCase();
    const area = (ex.area || '').toLowerCase();
    const titulo = (ex.titulo || '').toLowerCase();

    return nivel.includes(filtro) || area.includes(filtro) || titulo.includes(filtro);
  });

  // Alternar el desplegable de descripción sin activar la navegación
  const toggleDescripcion = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDescripcionesAbiertas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExamenClick = (examen: ExamenCompleto) => {
    // Si es demo o el usuario ya tiene suscripción activa
    if (examen.es_demo || suscripcion?.tiene_acceso) {
      window.location.href = `/simulacro/${examen.id}`;
    } else {
      setSelectedExamenTitulo(examen.titulo);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Header / Navbar Superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-black text-lg px-2.5 py-1 rounded-xl shadow-xs">
              P
            </span>
            <span className="font-bold text-slate-800 text-lg tracking-tight">PrimexDoc</span>
          </div>

          <div className="flex items-center gap-3">
            {suscripcion?.tiene_acceso ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
                Plan Premium Activo ✓
              </span>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors border border-amber-300 flex items-center gap-1 shadow-xs"
              >
                ⚡ Activar Premium
              </button>
            )}

            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">
        
        {/* Banner Bienvenida */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white p-6 sm:p-8 rounded-3xl mb-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hola, {user?.nombre_completo || 'Docente'} 👋
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl leading-relaxed">
              Selecciona un simulacro oficial para poner a prueba tus conocimientos sobre el enfoque pedagógico del Minedu y asegurar tu nombramiento o ascenso.
            </p>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Filtros Píldora / Chips con Contadores */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {areas.map((area) => {
            const count = area === 'Todos' 
              ? examenes.length 
              : examenes.filter(ex => {
                  const f = area.toLowerCase();
                  return (ex.nivel||'').toLowerCase().includes(f) || 
                         (ex.area||'').toLowerCase().includes(f) || 
                         (ex.titulo||'').toLowerCase().includes(f);
                }).length;

            const isSelected = filtroArea === area;

            return (
              <button
                key={area}
                onClick={() => setFiltroArea(area)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{area}</span>
                <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                  isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Estado de Carga */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse h-52 shadow-xs" />
            ))}
          </div>
        ) : examenesFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-slate-500 text-sm font-medium">No se encontraron simulacros para la categoría seleccionada.</p>
            <button 
              onClick={() => setFiltroArea('Todos')}
              className="mt-3 text-xs text-blue-600 font-bold hover:underline"
            >
              Ver todos los simulacros
            </button>
          </div>
        ) : (
          /* Grid de Tarjetas */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {examenesFiltrados.map((ex) => {
              const tieneAccesoExamen = ex.es_demo || suscripcion?.tiene_acceso;
              const estaAbierto = !!descripcionesAbiertas[ex.id];

              // Extracción de etiquetas desde los campos de la BD
              const tagNivel = ex.nivel || ex.area || 'EBR';
              const tagTipo = ex.tipo || (ex.titulo.toLowerCase().includes('nombramiento') ? 'Nombramiento' : 'Evaluación');
              const tagAnio = ex.anio || (ex.titulo.match(/\b(20\d{2})\b/)?.[0] ?? '');
              const duracion = ex.duracion_minutos || 180;

              return (
                <div
                  key={ex.id}
                  onClick={() => handleExamenClick(ex)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between relative hover:shadow-lg ${
                    tieneAccesoExamen
                      ? 'border-slate-200 hover:border-blue-400'
                      : 'border-slate-200 bg-slate-50/40 hover:border-amber-300'
                  }`}
                >
                  <div>
                    {/* Badge Acceso + Badge Tipo Examen */}
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                        {tagTipo}
                      </span>

                      {ex.es_demo ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs">
                          DEMO GRATIS
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                          🔒 PREMIUM
                        </span>
                      )}
                    </div>

                    {/* Título del Examen */}
                    <h3 className="font-extrabold text-slate-800 text-base leading-snug mb-3 hover:text-blue-600 transition-colors">
                      {ex.titulo}
                    </h3>

                    {/* TAGS INFORMATIVOS (Nivel, Año, Duración) */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                        📚 {tagNivel}
                      </span>
                      {tagAnio && (
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                          📅 {tagAnio}
                        </span>
                      )}
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                        ⏱️ {duracion} min
                      </span>
                    </div>

                    {/* BOTÓN Y SECCIÓN DESPLEGABLE DE DESCRIPCIÓN */}
                    {ex.descripcion && (
                      <div className="mt-2 mb-3">
                        <button
                          type="button"
                          onClick={(e) => toggleDescripcion(e, ex.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 focus:outline-none transition-colors"
                        >
                          <span>{estaAbierto ? '▲ Ocultar detalles' : '▼ Ver detalles y temario'}</span>
                        </button>

                        {estaAbierto && (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="mt-2.5 p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-600 leading-relaxed space-y-1.5 animate-fadeIn"
                          >
                            <p className="font-semibold text-slate-800 border-b border-blue-100 pb-1">
                              Información de la prueba:
                            </p>
                            <p>{ex.descripcion}</p>
                            <div className="pt-1 text-[11px] text-blue-900 font-medium flex items-center gap-1">
                              ✨ Incluye clave de respuestas y retroalimentación explicada.
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pie de la Tarjeta con Botón de Acción */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      MINEDU Oficial
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExamenClick(ex);
                      }}
                      className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs ${
                        tieneAccesoExamen
                          ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
                          : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md active:scale-95'
                      }`}
                    >
                      {tieneAccesoExamen ? 'Iniciar Simulacro →' : 'Desbloquear 🔒'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Modal Paywall */}
      <PaywallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        examenTitulo={selectedExamenTitulo}
      />
    </div>
  );
}