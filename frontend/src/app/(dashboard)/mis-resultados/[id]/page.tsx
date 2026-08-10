"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getDetalleResultado } from '@/services/historialService';
import { CheckCircle2, XCircle, Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// 1. Definimos la estructura exacta para evitar errores de tipo
interface OpcionResultado {
  id: string;
  etiqueta: string;
  texto_opcion: string;
}

interface DetallePregunta {
  pregunta_id: string;
  numero_pregunta: number;
  enunciado: string;
  texto_base_contenido: string | null;
  explicacion: string;
  opcion_seleccionada_id: string;
  opcion_correcta_id: string;
  es_correcta: boolean;
  opciones_json: OpcionResultado[];
}

export default function DetalleResultadoPage() {
  const params = useParams();
  const id = params.id as string;

  const [detalle, setDetalle] = useState<DetallePregunta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // CORRECCIÓN: Usamos una función anónima en el .then para asegurar el tipado
    getDetalleResultado(id)
      .then((data) => {
        setDetalle(data as DetallePregunta[]);
      })
      .catch((err) => {
        console.error("Error cargando detalle:", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium">Analizando tu desempeño...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/mis-resultados" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 transition-colors font-medium">
        <ArrowLeft size={18} /> Volver al historial
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-900">Revisión Pedagógica</h1>
        <p className="text-slate-500">Analiza tus respuestas y lee el sustento de cada pregunta.</p>
      </header>

      <div className="grid gap-8">
        {detalle.map((item) => (
          <div 
            key={item.pregunta_id} 
            className={`bg-white rounded-3xl border-2 overflow-hidden shadow-sm transition-all ${
              item.es_correcta ? 'border-emerald-100' : 'border-rose-100'
            }`}
          >
            {/* Indicador de Correcto/Incorrecto */}
            <div className={`px-6 py-3 flex justify-between items-center ${
              item.es_correcta ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              <span className="font-black text-xs uppercase tracking-widest">Pregunta {item.numero_pregunta}</span>
              <div className="flex items-center gap-2 font-bold text-sm">
                {item.es_correcta ? (
                  <><CheckCircle2 size={18} /> ¡Logrado!</>
                ) : (
                  <><XCircle size={18} /> Por mejorar</>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* Contexto Pedagógico (Texto Base) */}
              {item.texto_base_contenido && (
                <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 text-slate-600 text-sm leading-relaxed italic relative">
                  <span className="absolute -top-3 left-4 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">TEXTO DE APOYO</span>
                  {item.texto_base_contenido}
                </div>
              )}

              <p className="text-slate-800 font-bold text-lg mb-6 leading-relaxed">
                {item.enunciado}
              </p>

              {/* Lista de Alternativas */}
              <div className="grid gap-3 mb-8">
                {item.opciones_json.map((op) => {
                  const esLaQueMarco = op.id === item.opcion_seleccionada_id;
                  const esLaCorrecta = op.id === item.opcion_correcta_id;

                  let cardStyles = "border-slate-100 text-slate-500 bg-white";
                  let badgeStyles = "bg-slate-100 text-slate-400";

                  if (esLaCorrecta) {
                    cardStyles = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500";
                    badgeStyles = "bg-emerald-500 text-white";
                  } else if (esLaQueMarco) {
                    cardStyles = "border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500";
                    badgeStyles = "bg-rose-500 text-white";
                  }

                  return (
                    <div key={op.id} className={`p-4 rounded-2xl border-2 flex gap-4 items-start transition-all ${cardStyles}`}>
                      <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full font-black text-xs ${badgeStyles}`}>
                        {op.etiqueta}
                      </span>
                      <span className="flex-1 font-semibold text-sm sm:text-base">{op.texto_opcion}</span>
                      {esLaCorrecta && <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />}
                      {esLaQueMarco && !esLaCorrecta && <XCircle size={20} className="text-rose-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Explicación Pedagógica */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-800 font-bold mb-3">
                  <Info size={20} />
                  <span className="text-sm uppercase tracking-wide">Retroalimentación explicada:</span>
                </div>
                <p className="text-blue-900/80 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
                  {item.explicacion || "El sustento pedagógico para esta pregunta estará disponible pronto."}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}