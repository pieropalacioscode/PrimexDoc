// src/app/(dashboard)/resultados/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getHistorial, IntentoExamen } from '@/services/historialService';
import { fetchAPI } from '@/services/api';
import {
  ChevronRight,
  History,
  Search,
  ArrowRight,
  Trash2,
  ChevronLeft,
  X,
  Loader2,
  MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';

export default function MisResultadosPage() {
  const router = useRouter();
  const [intentos, setIntentos] = useState<IntentoExamen[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA BÚSQUEDA Y PAGINACIÓN
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = () => {
    setLoading(true);
    getHistorial()
      .then((data: any) => {
        if (Array.isArray(data)) setIntentos(data);
        else if (data?.intentos) setIntentos(data.intentos);
        else setIntentos([]);
      })
      .catch(() => setIntentos([]))
      .finally(() => setLoading(false));
  };

  // ============================================================
  // LÓGICA DE FILTRADO Y BÚSQUEDA
  // ============================================================
  const intentosFiltrados = useMemo(() => {
    return intentos.filter(intento =>
      intento.examen_titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (intento.nivel || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [intentos, searchQuery]);

  // Lógica de Paginación
  const totalPages = Math.ceil(intentosFiltrados.length / itemsPerPage);
  const currentItems = intentosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Genera el rango de páginas visibles: actual ± 1, siempre primera y última, "..." para el resto
  const paginasVisibles = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const paginas: (number | 'dots')[] = [1];

    if (currentPage > 3) paginas.push('dots');

    const inicio = Math.max(2, currentPage - 1);
    const fin = Math.min(totalPages - 1, currentPage + 1);
    for (let i = inicio; i <= fin; i++) paginas.push(i);

    if (currentPage < totalPages - 2) paginas.push('dots');

    paginas.push(totalPages);

    return paginas;
  }, [currentPage, totalPages]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // ============================================================
  // ACCIONES (ELIMINAR / NAVEGAR)
  // ============================================================
  const handleEliminar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.")) return;

    try {
      await fetchAPI(`/intentos/${id}`, { method: 'DELETE' });
      setIntentos(prev => prev.filter(i => i.id !== id));
      if (currentItems.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    } catch (err) {
      alert("No se pudo eliminar el registro. Inténtalo de nuevo.");
    }
  };

  const irARevision = (id: string) => router.push(`/resultados/${id}`);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-600" size={40} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Cargando tu historial...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 animate-in fade-in duration-700">

      {/* HEADER TIPO DASHBOARD (consistente con Mis Guardados) */}
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="p-3.5 sm:p-4 bg-slate-900 text-cyan-400 rounded-3xl shadow-xl shadow-cyan-900/20 border border-cyan-500/30 shrink-0">
            <History size={28} className="sm:w-8 sm:h-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase italic truncate">
              Mi <span className="text-cyan-600">Historial</span>
            </h1>
            <p className="text-slate-400 font-bold text-[11px] sm:text-xs uppercase tracking-widest mt-1">
              Registro de tu progreso y aprendizaje
            </p>
          </div>
        </div>

        <Link
          href="/examenes"
          className="flex items-center justify-center gap-2 bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-cyan-200 transition-all active:scale-95 shadow-sm shrink-0"
        >
          Ver catálogo <ArrowRight size={16} />
        </Link>
      </header>

      {/* BUSCADOR */}
      <div className="relative w-full mb-10 group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-300 group-focus-within:text-cyan-600 transition-colors">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder="Buscar por examen o nivel..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-14 pr-12 py-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm focus:ring-4 focus:ring-cyan-50 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-5 flex items-center text-slate-300 hover:text-rose-500 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ESTADO VACÍO O RESULTADOS NO ENCONTRADOS */}
      {intentosFiltrados.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-10 sm:p-20 text-center">
          <div className="bg-slate-50 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-slate-300" size={36} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter">
            {searchQuery ? 'Sin coincidencias' : 'Aún no hay registros'}
          </h2>
          <p className="text-slate-500 mt-3 mb-10 max-w-sm mx-auto font-medium text-sm sm:text-base">
            {searchQuery
              ? `No encontramos resultados para "${searchQuery}"`
              : "Aún no has realizado ningún simulacro. Empieza a entrenar y tu progreso aparecerá aquí."}
          </p>
          <Link
            href="/examenes"
            className="inline-flex items-center gap-3 bg-slate-900 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-2xl shadow-slate-200"
          >
            Ver exámenes disponibles <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <>
          {/* LISTA DE TARJETAS */}
          <div className="grid gap-5">
            {currentItems.map((intento) => (
              <div
                key={intento.id}
                onClick={() => irARevision(intento.id)}
                className="group bg-white border-2 border-slate-100 rounded-[2rem] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 lg:gap-6 hover:border-cyan-200 hover:shadow-2xl hover:shadow-cyan-900/5 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex-1 min-w-0 z-10">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-[10px] font-black px-2.5 py-1 bg-slate-900 text-cyan-400 rounded-lg uppercase tracking-widest shrink-0">
                      {intento.nivel || 'EBR'}
                    </span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      {new Date(intento.iniciado_en).toLocaleDateString('es-PE')}
                    </span>
                  </div>

                  <h3 className="font-black text-slate-800 text-lg sm:text-xl group-hover:text-cyan-700 transition-colors pr-0 lg:pr-8 tracking-tight line-clamp-2">
                    {intento.examen_titulo}
                  </h3>
                </div>

                {/* BLOQUE DE STATS - con flex-wrap para pantallas angostas */}
                <div className="flex items-center flex-wrap gap-3 sm:gap-4 bg-slate-50 group-hover:bg-cyan-50/50 p-4 rounded-2xl transition-colors border border-transparent group-hover:border-cyan-100">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="pr-3 sm:pr-4 text-center border-r border-slate-200 group-hover:border-cyan-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Puntaje</p>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-cyan-700 leading-none">{intento.puntaje || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Correctas</p>
                      <p className="text-xl sm:text-2xl font-black text-emerald-600 leading-none">{intento.preguntas_correctas || 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-auto sm:ml-2">
                    <button
                      onClick={(e) => handleEliminar(e, intento.id)}
                      className="p-3 bg-white text-slate-300 hover:text-rose-600 hover:bg-rose-50 border-2 border-slate-100 rounded-xl transition-all"
                      title="Eliminar registro"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="p-3 bg-slate-900 text-cyan-400 rounded-xl shadow-lg shadow-slate-200 transition-transform group-hover:translate-x-1 group-hover:bg-cyan-600 group-hover:text-white">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINACIÓN INTELIGENTE (con truncado en rangos largos) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-10 flex-wrap">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-xl border-2 border-slate-100 disabled:opacity-30 hover:bg-white hover:border-cyan-200 transition-all shadow-sm shrink-0"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex gap-1.5 sm:gap-1">
                {paginasVisibles.map((p, i) =>
                  p === 'dots' ? (
                    <span
                      key={`dots-${i}`}
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-slate-300"
                    >
                      <MoreHorizontal size={18} />
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl text-sm font-black transition-all shrink-0 ${
                        currentPage === p
                          ? 'bg-slate-900 text-cyan-400 shadow-lg shadow-slate-200'
                          : 'bg-white text-slate-500 border-2 border-slate-100 hover:bg-slate-50 hover:border-cyan-200'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-xl border-2 border-slate-100 disabled:opacity-30 hover:bg-white hover:border-cyan-200 transition-all shadow-sm shrink-0"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}