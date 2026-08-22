// src/components/dashboard/PreguntaCard.tsx
import React from 'react';
import { Pregunta, Opcion } from '../types/index';
import { BookText, Brain, GraduationCap, Tag, CheckCircle2 } from 'lucide-react';

interface Props {
  pregunta: Pregunta;
  respuestaSeleccionada?: string;
  onSeleccionarOpcion?: (preguntaId: string, etiqueta: string) => void;
}

// Configuración visual por subprueba con Iconos
const SUBPRUEBA_CONFIG: Record<string, { color: string; icon: any; bg: string }> = {
  "Comprensión Lectora": { 
    color: "text-blue-700", 
    bg: "bg-blue-50 border-blue-100", 
    icon: BookText 
  },
  "Razonamiento Lógico": { 
    color: "text-purple-700", 
    bg: "bg-purple-50 border-purple-100", 
    icon: Brain 
  },
  "Conocimientos Pedagógicos": { 
    color: "text-emerald-700", 
    bg: "bg-emerald-50 border-emerald-100", 
    icon: GraduationCap 
  },
};

export default function PreguntaCard({
  pregunta,
  respuestaSeleccionada,
  onSeleccionarOpcion,
}: Props) {
  const config = SUBPRUEBA_CONFIG[pregunta.subprueba || ""] || {
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    icon: Tag
  };

  const Icon = config.icon;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all mb-8 relative overflow-hidden group">
      
      {/* 1. CABECERA: METADATOS PEDAGÓGICOS */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-black text-[10px] uppercase tracking-wider shadow-xs ${config.bg} ${config.color}`}>
          <Icon size={14} strokeWidth={2.5} />
          {pregunta.subprueba || "Evaluación General"}
        </div>
        
        {pregunta.componente && (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl border border-slate-100 bg-white text-slate-400 font-bold text-[10px] uppercase tracking-wider">
            <Tag size={12} />
            {pregunta.componente}
          </div>
        )}
      </div>

      {/* 2. ENUNCIADO DE LA PREGUNTA */}
      <div className="relative mb-8">
        <div className="flex gap-4">
          <span className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-sm shadow-lg shadow-slate-200">
            {pregunta.numero_pregunta}
          </span>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight pt-1">
            {pregunta.texto_pregunta || (pregunta as any).enunciado}
          </h2>
        </div>
      </div>

      {/* 3. OPCIONES DE RESPUESTA */}
      <div className="grid gap-4">
        {pregunta.opciones?.map((opcion: Opcion) => {
          const isSelected = respuestaSeleccionada === opcion.etiqueta;

          return (
            <button
              key={opcion.id || opcion.etiqueta}
              type="button"
              onClick={() => onSeleccionarOpcion?.(pregunta.id, opcion.etiqueta)}
              className={`flex items-center gap-4 p-5 rounded-[1.5rem] border-2 transition-all text-left w-full relative group/option ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100/50 ring-4 ring-blue-50'
                  : 'border-slate-100 bg-slate-50/30 hover:border-slate-300 hover:bg-white text-slate-700'
              }`}
            >
              {/* Badge de la Letra (A, B, C) */}
              <div
                className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl text-sm font-black transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white scale-110 shadow-md'
                    : 'bg-white text-slate-400 border border-slate-200 group-hover/option:border-blue-300 group-hover/option:text-blue-500'
                }`}
              >
                {opcion.etiqueta}
              </div>

              {/* Texto de la opción */}
              <span className={`text-base md:text-lg flex-1 leading-relaxed ${isSelected ? 'font-bold text-blue-900' : 'font-medium text-slate-600'}`}>
                {opcion.texto_opcion}
              </span>

              {/* Icono de Selección */}
              {isSelected && (
                <div className="flex-shrink-0 text-blue-600 animate-in zoom-in duration-300">
                  <CheckCircle2 size={24} fill="currentColor" className="text-white fill-blue-600" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Decoración visual sutil */}
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Icon size={120} />
      </div>
    </div>
  );
}

export { PreguntaCard };