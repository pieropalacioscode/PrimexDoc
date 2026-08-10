"use client";
import { useEffect, useState } from 'react';
import { getHistorial, IntentoExamen } from '@/services/historialService';
import { Calendar, Clock, Award, ChevronRight, FileText } from 'lucide-react';
import Link from 'next/link';

export default function MisResultadosPage() {
  const [intentos, setIntentos] = useState<IntentoExamen[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="p-10 text-center animate-pulse text-slate-500 font-medium">Cargando tu historial...</div>;
  }

  // Aseguramos que intentos es un array antes de intentar acceder a su longitud
  const historialSeguro = Array.isArray(intentos) ? intentos : [];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Mis Resultados</h1>
          <p className="text-slate-500 mt-1">Sigue tu progreso y mejora tus puntajes.</p>
        </div>
        <div className="hidden md:block text-right">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total exámenes</span>
          <p className="text-2xl font-black text-blue-600">{historialSeguro.length}</p>
        </div>
      </div>

      {historialSeguro.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="text-slate-300" size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Aún no hay intentos</h2>
          <p className="text-slate-500 mb-8">Tus resultados aparecerán aquí cuando termines un simulacro.</p>
          <Link href="/examenes" className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            Empezar ahora
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {historialSeguro.map((intento) => (
            <Link 
              key={intento.id} 
              href={`/resultados/${intento.id}`}
              className="group bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-50 transition-all cursor-pointer"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase border ${
                    intento.estado === 'completado' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {intento.estado}
                  </span>
                  <span className="text-slate-400 text-xs font-bold">
                    {intento.nivel || 'EBR'} • {intento.tipo || 'Evaluación'}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                  {intento.examen_titulo}
                </h3>
                <div className="flex gap-4 mt-3">
                   <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                     <Calendar size={14} className="text-slate-400" />
                     {new Date(intento.iniciado_en).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric'})}
                   </div>
                   <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                     <Clock size={14} className="text-slate-400" />
                     {Math.floor((intento.tiempo_empleado_segundos || 0) / 60)} min
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 group-hover:bg-blue-50 rounded-2xl p-4 transition-colors">
                <div className="text-center px-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Puntaje</p>
                  <p className="text-2xl font-black text-slate-900 group-hover:text-blue-700">{intento.puntaje || 0}</p>
                </div>
                <div className="h-10 w-[1px] bg-slate-200" />
                <div className="text-center px-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Correctas</p>
                  <p className="text-2xl font-black text-emerald-600">{intento.preguntas_correctas || 0}</p>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}