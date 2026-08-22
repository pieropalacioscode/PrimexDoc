'use client';

import React, { useState } from 'react';
import {
  ShieldCheck, FileText, CheckCircle2, Bookmark,
  Clock, ChevronDown, ChevronUp, Lock, Unlock,
} from 'lucide-react';
import { ExamenCompleto } from '@/types';
import { perfectExamenData, VARIANT_CONFIG } from '@/utils/dataPerfectioner';

interface Props {
  ex: ExamenCompleto;
  tieneAcceso: boolean;
  esFavorito?: boolean;
  onToggleFav?: (e: React.MouseEvent, id: string) => void;
  onClick: (ex: ExamenCompleto) => void;
}

const safeDescripcion = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const ExamenCard = ({ ex, tieneAcceso, esFavorito, onToggleFav, onClick }: Props) => {
  const data = perfectExamenData(ex);
  const variant = VARIANT_CONFIG[data.variant];
  const Icon = variant.icon;
  const descripcion = safeDescripcion((ex as any).descripcion);
  const [abierta, setAbierta] = useState(false);

  return (
    <div
      onClick={() => onClick(ex)}
      className="group relative flex flex-col bg-white rounded-[16px] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] border border-slate-200/60"
    >
      {/* ==================================================== */}
      {/* 1. PORTADA MINEDU OFICIAL */}
      {/* ==================================================== */}
      <div className="w-full flex flex-col shrink-0 select-none" style={{ height: '270px' }}>
        <div
          className="h-6 w-full opacity-90"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #3f3f3f, #3f3f3f 6px, #2a2a2a 6px, #2a2a2a 12px)' }}
        />

        <div
          className="px-5 py-1.5 text-white font-sans font-black italic tracking-tight text-[12px] flex items-center"
          style={{ backgroundColor: variant.accent }}
        >
          <span className="mr-1 text-[14px] font-normal leading-none">»</span>Evaluación Docente
        </div>

        <div className="bg-[#757677] text-white px-6 pt-5 pb-6 flex flex-col">
          <h2 className="text-[17px] font-serif leading-tight tracking-wide font-normal">Educación Básica Regular</h2>
          <h3 className="text-[17px] font-serif leading-tight tracking-wide font-normal mt-0.5">Nivel {data.nivel}</h3>
          <h3 className="text-[17px] font-serif leading-tight tracking-wide font-normal mt-0.5">
            {data.codigo} / {data.area}
          </h3>
        </div>

        <div className="bg-[#d9d9d9] text-[#363636] px-6 pt-5 pb-6 flex-1 flex flex-col justify-start">
          <h2 className="text-[20px] font-serif leading-tight font-normal">{data.tipoProceso}</h2>
          <h3 className="text-[20px] font-serif leading-tight font-normal mt-0.5">Educación Básica</h3>

          <span
            className="mt-4 text-white px-2.5 py-0.5 text-[11px] font-sans font-bold w-max shadow-sm"
            style={{ backgroundColor: variant.accentDark }}
          >
            Convocatoria {data.anio}
          </span>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. METADATOS Y ACCIONES */}
      {/* ==================================================== */}
      <div className="flex flex-col p-5 bg-white border-t border-slate-100 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: variant.accentSoft, color: variant.accent }}
          >
            <Icon size={12} strokeWidth={2.5} /> {variant.label}
          </div>

          {onToggleFav && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(e, ex.id); }}
              className="p-1 text-slate-300 hover:text-amber-500 transition-colors"
            >
              <Bookmark size={18} fill={esFavorito ? 'currentColor' : 'none'} className={esFavorito ? 'text-amber-500' : ''} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-500">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={14} className="text-emerald-500" /> Nivel: {data.nivel}
          </div>
          <div className="flex items-center gap-1">
            <FileText size={14} className="text-slate-400" /> Cuadernillo Oficial
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-slate-400" /> MINEDU
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} className="text-slate-400" /> {data.duracion} min
          </div>
        </div>

        {/* Detalles expandibles (descripción del temario) */}
        {descripcion && (
          <div className="mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); setAbierta((p) => !p); }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
            >
              {abierta ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {abierta ? 'Ocultar temario' : 'Ver detalles'}
            </button>
            {abierta && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 border border-slate-100"
              >
                {descripcion}
              </div>
            )}
          </div>
        )}

        {/* Botón de Acción Principal */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            {tieneAcceso ? 'Examen Abierto' : 'Solo Premium'}
          </span>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tieneAcceso
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-800 hover:bg-slate-900 text-white'
            }`}
          >
            {tieneAcceso ? 'Iniciar Simulacro' : 'Desbloquear'}
            {tieneAcceso ? <Unlock size={12} /> : <Lock size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};