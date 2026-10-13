//frontend > src > app > (dashboard) > examenes >  page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/services/api';
import { ExamenCompleto, EstadoSuscripcion } from '@/types';
import PaywallModal from '@/components/PaywallModal';
import { Search, AlertCircle, RefreshCw, Filter, Calendar, Award, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { toggleFavorito, getFavoritos } from '@/services/historialService';
import { ExamenCard } from '../ExamenCard';
import { SequenceLaunch } from './SequenceLaunch';
// Asegúrate de importar el componente SequenceLaunch desde su ruta correcta

export default function ExamenesPage() {
  const { user } = useAuth();
  const [examenes, setExamenes] = useState<ExamenCompleto[]>([]);
  const [suscripcion, setSuscripcion] = useState<EstadoSuscripcion | null>(null);

  // Estados de Filtros
  const [filtroNivel, setFiltroNivel] = useState<string>('Todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [filtroAnio, setFiltroAnio] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [favoritosIds, setFavoritosIds] = useState<Set<string>>(new Set());

  // Modal Paywall
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamenTitulo, setSelectedExamenTitulo] = useState<string>('');

  // Estados de Secuencia de Lanzamiento
  const [showLaunch, setShowLaunch] = useState(false);
  const [targetExamen, setTargetExamen] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 🚩 INTELIGENCIA: Cada promesa maneja su propio error para no tumbar a las demás
      const [dataExamenes, dataSub, dataFavs] = await Promise.all([
        fetchAPI<ExamenCompleto[]>('/examenes').catch(err => {
          console.error("Error cargando exámenes:", err);
          return [] as ExamenCompleto[];
        }),
        fetchAPI<EstadoSuscripcion>('/me/suscripcion').catch(() => ({
          tiene_acceso: false,
          vence: null
        } as EstadoSuscripcion)),
        getFavoritos().catch(() => []),
      ]);

      setExamenes(dataExamenes);
      setSuscripcion(dataSub);
      setFavoritosIds(new Set(dataFavs.map((f: any) => f.id || f.examen_id)));

      // Si todo vino vacío, es probable que sea el Rate Limit
      if (dataExamenes.length === 0) {
        setErrorMsg("No pudimos cargar los exámenes. Por favor, espera un momento y recarga.");
      }

    } catch (err: any) {
      setErrorMsg('Error de sincronización con el portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Generación de opciones únicas para filtros
  const opcionesFiltros = useMemo(() => {
    return {
      niveles: ['Todos', ...new Set(examenes.map(ex => ex.nivel).filter(Boolean))],
      tipos: ['Todos', ...new Set(examenes.map(ex => ex.tipo).filter(Boolean))],
      anios: ['Todos', ...new Set(examenes.map(ex => ex.anio?.toString()).filter(Boolean))].sort((a,b) => b!.localeCompare(a!))
    };
  }, [examenes]);

  const examenesFiltrados = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return examenes.filter((ex) => {
      const matchNivel = filtroNivel === 'Todos' || ex.nivel === filtroNivel;
      const matchTipo = filtroTipo === 'Todos' || ex.tipo === filtroTipo;
      const matchAnio = filtroAnio === 'Todos' || ex.anio?.toString() === filtroAnio;
      const matchSearch = query === '' || ex.titulo.toLowerCase().includes(query) || (ex.codigo_cuadernillo || '').toLowerCase().includes(query);
      return matchNivel && matchTipo && matchAnio && matchSearch;
    });
  }, [examenes, filtroNivel, filtroTipo, filtroAnio, searchQuery]);

  const tieneAcceso = !!(suscripcion?.tiene_acceso || (suscripcion as any)?.activo);

  // INTERCEPTOR DE CLICS PARA ABRIR EL LAUNCH ROOM O PAYWALL
  const handleExamenClick = (examen: ExamenCompleto) => {
    // Lógica Inteligente: Permitir si es demo, si tiene plan activo, O si el backend
    // marca el examen como gratuito (examen.es_gratuito). Ese campo viene de la
    // misma fuente de verdad única que usa el backend (auth.ExamenesGratuitos) —
    // ya no mantenemos una lista aparte en el frontend que pueda desincronizarse.
    if (examen.es_demo || tieneAcceso || examen.es_gratuito) {
      setTargetExamen(examen.id);
      setShowLaunch(true); // Activa la animación brutal
    } else {
      setSelectedExamenTitulo(examen.titulo);
      setIsModalOpen(true); // Muestra el Paywall
    }
  };

  // TOGGLE DE FAVORITOS: optimista + notificación con sonner
  const handleToggleFavorito = async (e: React.MouseEvent, id: string, titulo: string) => {
    e.stopPropagation();

    // Optimismo: Actualizamos la UI antes de la respuesta del servidor para que se sienta instantáneo
    const esFavoritoActual = favoritosIds.has(id);

    setFavoritosIds(prev => {
      const next = new Set(prev);
      if (esFavoritoActual) next.delete(id);
      else next.add(id);
      return next;
    });

    try {
      await toggleFavorito(id);

      // Alerta Premium con Sonner
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
      // Si falla, revertimos el cambio visual
      setFavoritosIds(prev => {
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
      {/* Componente de Secuencia de Lanzamiento en Pantalla Completa */}
      {showLaunch && targetExamen && (
        <SequenceLaunch
          onComplete={() => window.location.href = `/simulacro/${targetExamen}`}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 pb-20 animate-in fade-in duration-700">
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 text-red-800">
              <AlertCircle size={24} />
              <p className="font-bold">{errorMsg}</p>
            </div>
            <button onClick={loadData} className="bg-red-800 text-white p-3 rounded-xl hover:rotate-180 transition-all duration-500">
              <RefreshCw size={18} />
            </button>
          </div>
        )}

        {/* HEADER INSTITUCIONAL */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0A1628] via-[#0D1F35] to-[#0A1628] p-10 text-white shadow-2xl border border-[#22D3EE]/10 mt-6">
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
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl pointer-events-none bg-[#22D3EE]" />
        </section>

        {/* PANEL DE CONTROL: BUSCADOR + FILTROS DE BOTONES */}
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

          {/* FILTROS POR BOTONES */}
          <div className="grid grid-cols-1 gap-6">
            {/* Fila Nivel */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-[11px] font-black uppercase text-slate-400 w-24 shrink-0 tracking-widest">Nivel:</span>
              <div className="flex flex-wrap gap-2">
                {opcionesFiltros.niveles.map(n => (
                  <button key={n} onClick={() => setFiltroNivel(n!)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${filtroNivel === n ? 'bg-cyan-600 border-cyan-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-cyan-200'}`}>{n}</button>
                ))}
              </div>
            </div>
            {/* Fila Tipo */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-[11px] font-black uppercase text-slate-400 w-24 shrink-0 tracking-widest">Proceso:</span>
              <div className="flex flex-wrap gap-2">
                {opcionesFiltros.tipos.map(t => (
                  <button key={t} onClick={() => setFiltroTipo(t!)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${filtroTipo === t ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>{t}</button>
                ))}
              </div>
            </div>
            {/* Fila Año */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <span className="text-[11px] font-black uppercase text-slate-400 w-24 shrink-0 tracking-widest">Año:</span>
              <div className="flex flex-wrap gap-2">
                {opcionesFiltros.anios.map(a => (
                  <button key={a} onClick={() => setFiltroAnio(a!)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${filtroAnio === a ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200'}`}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* GRID DE EXÁMENES */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {loading ? (
            [1, 2, 3, 4].map(i => <div key={i} className="h-[440px] animate-pulse rounded-[16px] bg-slate-200" />)
          ) : examenesFiltrados.map((ex) => (
            <ExamenCard
              key={ex.id}
              ex={ex}
              tieneAcceso={tieneAcceso}
              esFavorito={favoritosIds.has(ex.id)}
              onToggleFav={(e, id) => handleToggleFavorito(e, id, ex.titulo)} // 🔥 Ahora sí envía la lógica
              onClick={handleExamenClick} // Enlazamos con la nueva función interceptora
            />
          ))}
        </div>

        <PaywallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} examenTitulo={selectedExamenTitulo} />
      </div>
    </>
  );
}