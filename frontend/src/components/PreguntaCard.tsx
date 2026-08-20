import React from 'react';
import { Pregunta, Opcion } from '../types/index';

interface Props {
  pregunta: Pregunta;
  respuestaSeleccionada?: string;
  onSeleccionarOpcion?: (preguntaId: string, etiqueta: string) => void;
}

// Colores por subprueba para destacar visualmente
const subpruebaColors: Record<string, string> = {
  "Comprensión Lectora": "bg-blue-100 text-blue-700 border-blue-200",
  "Razonamiento Lógico": "bg-purple-100 text-purple-700 border-purple-200",
  "Conocimientos Pedagógicos": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function PreguntaCard({
  pregunta,
  respuestaSeleccionada,
  onSeleccionarOpcion,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      {/* 1. BADGES DE DATOS ENRIQUECIDOS (Subprueba / Componente) */}
      {(pregunta.subprueba || pregunta.componente) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {pregunta.subprueba && (
            <span
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${
                subpruebaColors[pregunta.subprueba] || "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {pregunta.subprueba}
            </span>
          )}
          {pregunta.componente && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border bg-slate-50 text-slate-500 border-slate-200">
              {pregunta.componente}
            </span>
          )}
        </div>
      )}

      {/* 2. ENUNCIADO DE LA PREGUNTA */}
      <div className="text-lg font-medium text-slate-800 mb-6 leading-relaxed">
        <span className="text-blue-600 font-bold mr-2">
          P{pregunta.numero_pregunta}.
        </span>
        {pregunta.texto_pregunta || (pregunta as any).enunciado}
      </div>

      {/* 3. OPCIONES DE RESPUESTA */}
      <div className="grid gap-3">
        {pregunta.opciones?.map((opcion: Opcion) => {
          const isSelected = respuestaSeleccionada === opcion.etiqueta;

          return (
            <button
              key={opcion.id || opcion.etiqueta}
              type="button"
              onClick={() => onSeleccionarOpcion?.(pregunta.id, opcion.etiqueta)}
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 transition-all text-left w-full ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-medium shadow-xs'
                  : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 text-slate-700'
              }`}
            >
              {/* Círculo/Badge con la Letra de la Opción */}
              <span
                className={`flex items-center justify-center min-w-[28px] h-7 rounded-lg text-xs font-bold transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {opcion.etiqueta}
              </span>

              {/* Texto de la opción */}
              <span className="pt-0.5 text-base leading-relaxed flex-1">
                {opcion.texto_opcion}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { PreguntaCard };