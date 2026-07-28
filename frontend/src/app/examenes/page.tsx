'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/services/api';
import { Examen, EstadoSuscripcion } from '@/types';
import PaywallModal from '@/components/PaywallModal';
import Link from 'next/link';

export default function ExamenesPage() {
  const { user, logout } = useAuth();
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [suscripcion, setSuscripcion] = useState<EstadoSuscripcion | null>(null);
  const [filtroArea, setFiltroArea] = useState<string>('Todos');
  const [loading, setLoading] = useState(true);
  
  // Estado para el Modal Paywall
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamenTitulo, setSelectedExamenTitulo] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const [dataExamenes, dataSub] = await Promise.all([
          fetchAPI<Examen[]>('/examenes'),
          fetchAPI<EstadoSuscripcion>('/me/suscripcion').catch(() => ({ tiene_acceso: false })),
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

  const examenesFiltrados = examenes.filter((ex) => {
    if (filtroArea === 'Todos') return true;
    return ex.area?.toLowerCase() === filtroArea.toLowerCase();
  });

  const handleExamenClick = (examen: Examen) => {
    // Si es demo o el usuario ya tiene suscripción activa
    if (examen.es_demo || suscripcion?.tiene_acceso) {
      window.location.href = `/simulacro/${examen.id}`;
    } else {
      setSelectedExamenTitulo(examen.titulo);
      setIsModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* Header / Navbar Superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-black text-lg px-2.5 py-1 rounded-xl">
              P
            </span>
            <span className="font-bold text-slate-800 text-lg">PrimexDoc</span>
          </div>

          <div className="flex items-center gap-3">
            {suscripcion?.tiene_acceso ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                Plan Premium Activo ✓
              </span>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
              >
                ⚡ Activar Premium
              </button>
            )}

            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-1 w-full">
        
        {/* Banner Bienvenida */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 sm:p-8 rounded-3xl mb-6 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-extrabold">
            Hola, {user?.nombre_completo || 'Docente'} 👋
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Selecciona un simulacro oficial para poner a prueba tus conocimientos sobre el enfoque pedagógico del Minedu.
          </p>
        </div>

        {/* Filtros Píldora / Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setFiltroArea(area)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                filtroArea === area
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        {/* Estado de Carga */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse h-40" />
            ))}
          </div>
        ) : examenesFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-sm">No se encontraron simulacros en este nivel.</p>
          </div>
        ) : (
          /* Grid de Tarjetas */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {examenesFiltrados.map((ex) => {
              const tieneAccesoExamen = ex.es_demo || suscripcion?.tiene_acceso;

              return (
                <div
                  key={ex.id}
                  onClick={() => handleExamenClick(ex)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between relative hover:shadow-md ${
                    tieneAccesoExamen
                      ? 'border-slate-200 hover:border-blue-400'
                      : 'border-slate-200/80 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Badge Demo vs Premium */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {ex.area || 'EBR'}
                      </span>
                      {ex.es_demo ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          DEMO GRATIS
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                          🔒 PREMIUM
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-800 text-base leading-snug mb-2">
                      {ex.titulo}
                    </h3>
                    
                    {ex.descripcion && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                        {ex.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400 font-medium">
                      ⏱ {ex.duracion_minutos || 180} min
                    </span>

                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ${
                        tieneAccesoExamen
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-slate-800 text-white hover:bg-slate-900'
                      }`}
                    >
                      {tieneAccesoExamen ? 'Iniciar Simulacro →' : 'Desbloquear 🔒'}
                    </span>
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