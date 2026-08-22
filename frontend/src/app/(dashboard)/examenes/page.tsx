'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/services/api';
import { ExamenCompleto, EstadoSuscripcion } from '@/types';
import PaywallModal from '@/components/PaywallModal';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';
import { toggleFavorito, getFavoritos } from '@/services/historialService';
import { ExamenCard } from '../ExamenCard';

const NIVEL_FILTROS = ['Todos', 'Inicial', 'Primaria', 'Secundaria', 'General'] as const;

export default function ExamenesPage() {
  const { user } = useAuth();
  const [examenes, setExamenes] = useState<ExamenCompleto[]>([]);
  const [suscripcion, setSuscripcion] = useState<EstadoSuscripcion | null>(null);
  const [filtroArea, setFiltroArea] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [favoritosIds, setFavoritosIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamenTitulo, setSelectedExamenTitulo] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [dataExamenes, dataSub, dataFavs] = await Promise.all([
        fetchAPI<ExamenCompleto[]>('/examenes'),
        fetchAPI<EstadoSuscripcion>('/me/suscripcion').catch(() => ({ tiene_acceso: false } as EstadoSuscripcion)),
        getFavoritos().catch(() => []),
      ]);
      setExamenes(dataExamenes);
      setSuscripcion(dataSub);
      setFavoritosIds(new Set(dataFavs.map((f: any) => f.id || f.examen_id)));
    } catch (err: any) {
      setErrorMsg('Error de conexión con el servidor. No pudimos cargar los cuadernillos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExamenClick = useCallback(
    (examen: ExamenCompleto) => {
      const acceso = suscripcion?.tiene_acceso || (suscripcion as any)?.activo;
      if (examen.es_demo || acceso) {
        window.location.href = `/simulacro/${examen.id}`;
      } else {
        setSelectedExamenTitulo(examen.titulo);
        setIsModalOpen(true);
      }
    },
    [suscripcion]
  );

  const handleToggleFav = useCallback(async (e: React.MouseEvent, examenId: string) => {
    e.stopPropagation();
    try {
      await toggleFavorito(examenId);
      setFavoritosIds((prev) => {
        const next = new Set(prev);
        next.has(examenId) ? next.delete(examenId) : next.add(examenId);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const examenesFiltrados = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return examenes.filter((ex) => {
      const matchArea = filtroArea === 'Todos' || (ex.nivel || '').toLowerCase().includes(filtroArea.toLowerCase());
      const matchSearch =
        query === '' ||
        ex.titulo.toLowerCase().includes(query) ||
        (ex.codigo_cuadernillo || '').toLowerCase().includes(query);
      return matchArea && matchSearch;
    });
  }, [examenes, filtroArea, searchQuery]);

  const tieneAcceso = !!(suscripcion?.tiene_acceso || (suscripcion as any)?.activo);

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 text-red-800">
            <AlertCircle size={24} />
            <p className="font-bold">{errorMsg}</p>
          </div>
          <button
            onClick={loadData}
            className="bg-red-800 text-white p-3 rounded-xl hover:rotate-180 transition-all duration-500"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      )}

      {/* 2. HEADER INSTITUCIONAL — paleta alineada al logo DOCENTE SMART (navy + cian glow) */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0A1628] via-[#0D1F35] to-[#0A1628] p-10 text-white shadow-2xl border border-[#22D3EE]/10">
        <div className="relative z-10">
          {tieneAcceso && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-4 py-1.5 text-[#22D3EE]">
              <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Acceso Premium Activo</span>
            </div>
          )}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">
            Hola, {user?.nombre_completo?.split(' ')[0]}
          </h1>
          <p className="mt-2 max-w-xl font-medium text-white/40">
            Plataforma Profesional de Preparación para la Carrera Pública Magisterial.
          </p>
        </div>

        {/* Glow ambiental cian, como el resplandor del logo */}
        <div
          className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }}
        />

        <div className="absolute inset-0 opacity-[0.07] pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='500' height='500' viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='25' fill='%2322D3EE' text-anchor='middle' transform='rotate(-20 250 250)'%3EEVALUACIÓN DOCENTE — MINEDU%3C/text%3E%3C/svg%3E")`,
              backgroundSize: '400px 400px',
            }}
          />
        </div>
      </section>
      
      <div className="space-y-6">
        <div className="relative max-w-3xl mx-auto">
          <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center text-[#77787A]">
            <Search size={22} />
          </div>
          <input
            type="text"
            placeholder="BUSCAR CUADERNILLO (CÓDIGO, TÍTULO O AÑO)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-[2rem] border border-[#D2D3D5] bg-white py-6 pl-16 pr-8 font-bold text-[#1D232C] uppercase tracking-wider shadow-sm focus:border-[#1BA04F] focus:ring-4 focus:ring-[#1BA04F]/10 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 justify-center">
          {NIVEL_FILTROS.map((area) => (
            <button
              key={area}
              onClick={() => setFiltroArea(area)}
              className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                filtroArea === area
                  ? 'bg-[#1D232C] text-white shadow-lg'
                  : 'bg-white text-[#77787A] border border-[#D2D3D5] hover:bg-slate-50'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[440px] animate-pulse rounded-[16px] bg-slate-200" />
          ))}
        </div>
      ) : examenesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#D2D3D5] py-20 text-center text-[#77787A]">
          <Search size={32} className="mb-3 opacity-40" />
          <p className="font-bold">No se encontraron cuadernillos con esos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {examenesFiltrados.map((ex) => (
            <ExamenCard
              key={ex.id}
              ex={ex}
              tieneAcceso={tieneAcceso}
              esFavorito={favoritosIds.has(ex.id)}
              onToggleFav={handleToggleFav}
              onClick={handleExamenClick}
            />
          ))}
        </div>
      )}

      <PaywallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} examenTitulo={selectedExamenTitulo} />
    </div>
  );
}