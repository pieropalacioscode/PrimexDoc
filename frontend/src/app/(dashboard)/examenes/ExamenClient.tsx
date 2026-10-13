// frontend > src > app > (dashboard) > examenes > ExamenesClient.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/services/api';
import { ExamenCompleto, EstadoSuscripcion } from '@/types';
import PaywallModal from '@/components/PaywallModal';
import { Search, AlertCircle, RefreshCw, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavorito, getFavoritos } from '@/services/historialService';
import { ExamenCard } from '../ExamenCard';
import { SequenceLaunch } from './SequenceLaunch';

interface ExamenesClientProps {
  // Catálogo público, embebido en el build desde el Excel maestro (ver
  // scripts/generar_catalogo_publico.py). No requiere sesión ni token.
  examenesIniciales: ExamenCompleto[];
}

export default function ExamenesClient({ examenesIniciales }: ExamenesClientProps) {
  const { user } = useAuth();

  // El catálogo es estático dentro de esta sesión de navegación: viene fijo
  // del build, así que no necesita ser "state" reactivo a un fetch — pero
  // lo dejamos en useState por si en el futuro se agrega un refresh manual.
  const [examenes] = useState<ExamenCompleto[]>(examenesIniciales);
  const [suscripcion, setSuscripcion] = useState<EstadoSuscripcion | null>(null);

  // Estados de Filtros
  const [filtroNivel, setFiltroNivel] = useState<string>('Todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroAnio, setFiltroAnio] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // loadingAuth cubre SOLO lo que depende de sesión: suscripción + favoritos
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [favoritosIds, setFavoritosIds] = useState<Set<string>>(new Set());

  // Modal Paywall
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamenTitulo, setSelectedExamenTitulo] = useState<string>('');

  // Estados de Secuencia de Lanzamiento
  const [showLaunch, setShowLaunch] = useState(false);
  const [targetExamen, setTargetExamen] = useState<string | null>(null);

  const loadDataAutenticada = useCallback(async () => {
    setLoadingAuth(true);
    setErrorMsg(null);
    try {
      const [dataSub, dataFavs] = await Promise.all([
        fetchAPI<EstadoSuscripcion>('/me/suscripcion').catch(
          () => ({ tiene_acceso: false, vence: null } as EstadoSuscripcion)
        ),
        getFavoritos().catch(() => []),
      ]);

      setSuscripcion(dataSub);
      setFavoritosIds(new Set(dataFavs.map((f: any) => f.id || f.examen_id)));
    } catch (err: any) {
      setErrorMsg('No se pudo verificar tu suscripción. Algunas funciones pueden estar limitadas.');
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    loadDataAutenticada();
  }, [loadDataAutenticada]);

  const opcionesFiltros = useMemo(() => {
    return {
      niveles: ['Todos', ...new Set(examenes.map((ex) => ex.nivel).filter(Boolean))],
      tipos: ['Todos', ...new Set(examenes.map((ex) => ex.tipo).filter(Boolean))],
      anios: ['Todos', ...new Set(examenes.map((ex) => ex.anio?.toString()).filter(Boolean))].sort(
        (a, b) => b!.localeCompare(a!)
      ),
    };
  }, [examenes]);

  const examenesFiltrados = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return examenes.filter((ex) => {
      const matchNivel = filtroNivel === 'Todos' || ex.nivel === filtroNivel;
      const matchTipo = filtroTipo === 'Todos' || ex.tipo === filtroTipo;
      const matchAnio = filtroAnio === 'Todos' || ex.anio?.toString() === filtroAnio;
      const matchSearch =
        query === '' ||
        ex.titulo.toLowerCase().includes(query) ||
        (ex.codigo_cuadernillo || '').toLowerCase().includes(query);
      return matchNivel && matchTipo && matchAnio && matchSearch;
    });
  }, [examenes, filtroNivel, filtroTipo, filtroAnio, searchQuery]);

  const tieneAcceso = !!(suscripcion?.tiene_acceso || (suscripcion as any)?.activo);

  const handleExamenClick = (examen: ExamenCompleto) => {
    // Única fuente de verdad: el campo que calcula el backend desde
    // auth.ExamenesGratuitos (mismo mapa que usa RequireSubscription).
    // Ya no se mantiene una lista duplicada en el frontend.
    const esGratuito = !!examen.es_gratuito;

    if (examen.es_demo || tieneAcceso || esGratuito) {
      setTargetExamen(examen.id);
      setShowLaunch(true);
    } else {
      setSelectedExamenTitulo(examen.titulo);
      setIsModalOpen(true);
    }
  };

  const handleToggleFavorito = async (e: React.MouseEvent, id: string, titulo: string) => {
    e.stopPropagation();

    const esFavoritoActual = favoritosIds.has(id);

    setFavoritosIds((prev) => {
      const next = new Set(prev);
      if (esFavoritoActual) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      await toggleFavorito(id);

      if (!esFavoritoActual) {
        toast.success('Guardado en tu biblioteca', {
          description: `${titulo} ahora está en tus guardados.`,
          icon: <Bookmark className="text-cyan-500" size={16} fill="currentColor" />,
        });
      } else {
        toast('Eliminado de favoritos', {
          description: 'Se ha quitado el cuadernillo de tu lista.',
        });
      }
    } catch (error) {
      setFavoritosIds((prev) => {
        const next = new Set(prev);
        if (esFavoritoActual) next.add(id);
        else next.delete(id);
        return next;
      });
      toast.error('Error al actualizar favoritos');
    }
  };

  return (
    <>
      {showLaunch && targetExamen && (
        <SequenceLaunch onComplete={() => (window.location.href = `/simulacro/${targetExamen}`)} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pb-20 animate-in fade-in duration-700">
        {errorMsg && (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 text-amber-800">
              <AlertCircle size={24} />
              <p className="font-bold text-sm">{errorMsg}</p>
            </div>
            <button
              onClick={loadDataAutenticada}
              className="bg-amber-800 text-white p-3 rounded-xl hover:rotate-180 transition-all duration-500"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0A1628] via-[#0D1F35] to-[#0A1628] p-10 text-white shadow-2xl border border-[#22D3EE]/10 mt-6">
          <div className="relative z-10">
            {tieneAcceso && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-4 py-1.5 text-[#22D3EE]">
                <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Acceso Premium Activo</span>
              </div>
            )}
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase">
              Hola, {user?.nombre_completo?.split(' ')[0] || 'Docente'}
            </h1>
            <p className="mt-2 max-w-xl font-medium text-white/40">
              Plataforma Profesional de Preparación para la Carrera Pública Magisterial.
            </p>
          </div>
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl pointer-events-none bg-[#22D3EE]" />
        </section>

        <div className="space-y-8 bg-white p-6 sm:p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#77787A]" size={22} />
            <input
              type="text"
              placeholder="BUSCAR CUADERNILLO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[2rem] border border-[#D2D3D5] bg-white py-6 pl-16 pr-8 font-bold text-[#1D232C] uppercase tracking-wider outline-none focus:ring-4 focus:ring-cyan-500/10 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-[11px] font-black uppercase text-slate-400 w-24 shrink-0 tracking-widest">
                Nivel:
              </span>
              <div className="flex flex-wrap gap-2">
                {opcionesFiltros.niveles.map((n) => (
                  <button
                    key={n}
                    onClick={() => setFiltroNivel(n!)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      filtroNivel === n
                        ? 'bg-cyan-600 border-cyan-600 text-white shadow-md'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-cyan-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-[11px] font-black uppercase text-slate-400 w-24 shrink-0 tracking-widest">
                Proceso:
              </span>
              <div className="flex flex-wrap gap-2">
                {opcionesFiltros.tipos.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipo(t!)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      filtroTipo === t
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-[11px] font-black uppercase text-slate-400 w-24 shrink-0 tracking-widest">
                Año:
              </span>
              <div className="flex flex-wrap gap-2">
                {opcionesFiltros.anios.map((a) => (
                  <button
                    key={a}
                    onClick={() => setFiltroAnio(a!)}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      filtroAnio === a
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {examenesFiltrados.map((ex) => (
            <ExamenCard
              key={ex.id}
              ex={ex}
              tieneAcceso={tieneAcceso}
              esFavorito={favoritosIds.has(ex.id)}
              onToggleFav={(e, id) => handleToggleFavorito(e, id, ex.titulo)}
              onClick={handleExamenClick}
            />
          ))}

          {examenesFiltrados.length === 0 && (
            <div className="md:col-span-2 text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                No hay cuadernillos que coincidan con los filtros seleccionados.
              </p>
            </div>
          )}
        </div>

        <PaywallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} examenTitulo={selectedExamenTitulo} />
      </div>
    </>
  );
}