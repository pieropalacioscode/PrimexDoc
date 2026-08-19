"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getHistorial, IntentoExamen } from '@/services/historialService';
import { 
  Calendar, 
  Clock, 
  ChevronRight, 
  FileText, 
  BarChart3, 
  Search,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function MisResultadosPage() {
  const router = useRouter();
  const [intentos, setIntentos] = useState<IntentoExamen[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================
  // CARGA DE DATOS (Con tu validación preventiva)
  // ============================================================
  useEffect(() => {
    getHistorial()
      .then((data: any) => {
        // Validación preventiva: Forzamos que sea un array
        // Soporta tanto si el backend devuelve el array directo, 
        // como si devuelve el objeto { total: X, intentos: [...] }
        if (Array.isArray(data)) {
          setIntentos(data);
        } else if (data && Array.isArray(data.intentos)) {
          setIntentos(data.intentos);
        } else {
          console.error("Los datos de historial no tienen el formato esperado:", data);
          setIntentos([]);
        }
      })
      .catch((err) => {
        console.error("Error al cargar historial:", err);
        setIntentos([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Aseguramos que intentos es un array antes de intentar acceder a su longitud
  const historialSeguro = Array.isArray(intentos) ? intentos : [];

  // ============================================================
  // MANEJADORES DE CLIC (Para evitar conflictos de enlaces)
  // ============================================================
  const irARevision = (id: string) => {
    router.push(`/resultados/${id}`);
  };

  const irADiagnostico = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Evita que el clic se propague a la tarjeta principal
    router.push(`/resultados/${id}/analitica`);
  };

  // ============================================================
  // ESTADO DE CARGA
  // ============================================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Cargando tu historial...</p>
      </div>
    );
  }

  // ============================================================
  // VISTA PRINCIPAL
  // ============================================================
  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-20">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-10 gap-4 sm:gap-6">
        <div className="w-full md:w-auto">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Mis Resultados</h1>
          <p className="text-slate-500 text-base sm:text-lg mt-1 font-medium">
            Sigue tu progreso y mejora tus puntajes.
          </p>
        </div>

        <div className="w-full md:w-auto bg-white px-5 sm:px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="text-left md:text-right">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total exámenes</span>
            <p className="text-2xl font-black text-blue-600 leading-none mt-0.5">{historialSeguro.length}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex shrink-0 items-center justify-center text-blue-600">
            <Search size={20} />
          </div>
        </div>
      </div>

      {/* ESTADO VACÍO */}
      {historialSeguro.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 sm:p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-slate-300" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Aún no hay intentos</h2>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm sm:text-base">
            Tus resultados aparecerán aquí cuando termines un simulacro.
          </p>
          <Link 
            href="/examenes" 
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Empezar ahora <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        
        /* LISTA DE INTENTOS */
        <div className="grid gap-4 sm:gap-5">
          {historialSeguro.map((intento) => (
            <div 
              key={intento.id}
              onClick={() => irARevision(intento.id)}
              className="group bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') irARevision(intento.id);
              }}
            >
              {/* INFO DEL EXAMEN */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider border ${
                    intento.estado === 'completado' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {intento.estado}
                  </span>
                  <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                    {intento.nivel || 'EBR'} • {intento.tipo || 'Evaluación'}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg sm:text-xl group-hover:text-blue-600 transition-colors line-clamp-2">
                  {intento.examen_titulo}
                </h3>
                
                <div className="flex flex-wrap gap-4 sm:gap-5 mt-3 sm:mt-4">
                   <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 font-medium text-xs sm:text-sm">
                     <Calendar size={14} className="text-slate-400" />
                     {new Date(intento.iniciado_en).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric'})}
                   </div>
                   <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 font-medium text-xs sm:text-sm">
                     <Clock size={14} className="text-slate-400" />
                     {Math.floor((intento.tiempo_empleado_segundos || 0) / 60)} min
                   </div>
                </div>
              </div>

              {/* PUNTAJES Y BOTONES DE ACCIÓN */}
              <div className="flex flex-col sm:flex-row items-center justify-between lg:justify-end gap-4 bg-slate-50 group-hover:bg-blue-50/50 p-4 rounded-2xl transition-colors border border-transparent group-hover:border-blue-100 w-full lg:w-auto">
                
                <div className="flex justify-around sm:justify-start w-full sm:w-auto gap-6 sm:gap-8 px-2">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Puntaje</p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 group-hover:text-blue-700 leading-none">
                      {intento.puntaje || 0}
                    </p>
                  </div>
                  <div className="w-[1px] bg-slate-200 group-hover:bg-blue-200" />
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Correctas</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none">
                      {intento.preguntas_correctas || 0}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  {/* Botón Diagnóstico Pro (Frena la propagación del clic) */}
                  <button
                    onClick={(e) => irADiagnostico(e, intento.id)}
                    className="flex-1 sm:flex-none p-3.5 sm:p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex items-center justify-center group/btn"
                    title="Ver Diagnóstico Pro"
                  >
                    <BarChart3 size={20} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                  
                  {/* Flecha visual indicativa */}
                  <div className="flex-1 sm:flex-none p-3.5 sm:p-3 bg-white border-2 border-slate-200 text-slate-400 rounded-xl group-hover:border-blue-500 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all flex items-center justify-center pointer-events-none">
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}