// src/app/(dashboard)/resultados/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getHistorial, IntentoExamen } from '@/services/historialService';
import { fetchAPI } from '@/services/api'; // Usaremos esto para eliminar
import { 
  Calendar, 
  Clock, 
  ChevronRight, 
  FileText, 
  Search,
  ArrowRight,
  Trash2,
  ChevronLeft,
  X
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

  // Reiniciar a página 1 cuando se busca
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
      // Si la página se queda vacía al eliminar, retroceder una página
      if (currentItems.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    } catch (err) {
      alert("No se pudo eliminar el registro. Inténtalo de nuevo.");
    }
  };

  const irARevision = (id: string) => router.push(`/resultados/${id}`);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold">Cargando tu historial...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-20 space-y-8">
      
      {/* HEADER + BUSCADOR INTELIGENTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Resultados</h1>
          <p className="text-slate-500 font-medium italic">Historial de progreso y aprendizaje.</p>
        </div>

        <div className="relative w-full md:w-96 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Search size={20} />
          </div>
          <input 
            type="text"
            placeholder="Buscar por examen o nivel..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-12 pr-10 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all font-medium text-slate-700"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ESTADO VACÍO O RESULTADOS NO ENCONTRADOS */}
      {intentosFiltrados.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="text-slate-300" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">No se encontraron resultados</h2>
          <p className="text-slate-500 mb-8 max-w-xs mx-auto">
            {searchQuery ? `No hay coincidencias para "${searchQuery}"` : "Aún no has realizado ningún simulacro."}
          </p>
          <Link href="/examenes" className="inline-flex bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all">
            Ver exámenes disponibles
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
                className="group bg-white border border-slate-200 rounded-[2rem] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-100/50 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex-1 min-w-0 z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-black px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg uppercase tracking-widest border border-blue-100">
                      {intento.nivel || 'EBR'}
                    </span>
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      {new Date(intento.iniciado_en).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-lg sm:text-xl group-hover:text-blue-700 transition-colors pr-8">
                    {intento.examen_titulo}
                  </h3>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 group-hover:bg-blue-50 p-4 rounded-2xl transition-colors border border-transparent group-hover:border-blue-100">
                  <div className="px-4 text-center border-r border-slate-200 group-hover:border-blue-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Puntaje</p>
                    <p className="text-2xl font-black text-slate-900 group-hover:text-blue-700 leading-none">{intento.puntaje || 0}</p>
                  </div>
                  <div className="px-4 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Correctas</p>
                    <p className="text-2xl font-black text-emerald-600 leading-none">{intento.preguntas_correctas || 0}</p>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={(e) => handleEliminar(e, intento.id)}
                      className="p-3 bg-white text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-slate-100 rounded-xl transition-all"
                      title="Eliminar registro"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 transition-transform group-hover:translate-x-1">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-12 h-12 rounded-xl text-sm font-black transition-all ${
                      currentPage === i + 1
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-xl border border-slate-200 disabled:opacity-30 hover:bg-white transition-all shadow-sm"
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