'use client';

import React, { useState } from 'react';
import {
  ShieldCheck, FileText, CheckCircle2, Bookmark,
  Clock, ChevronDown, ChevronUp, Lock, Unlock
} from 'lucide-react';
import { ExamenCompleto } from '@/types';
import { perfectExamenData, VARIANT_CONFIG } from '@/utils/dataPerfectioner';
import { EXAMENES_GRATUITOS_IDS } from '@/utils/constantes';

interface Props {
  ex: ExamenCompleto;
  tieneAcceso: boolean;
  esFavorito?: boolean;
  onToggleFav?: (e: React.MouseEvent, id: string) => void;
  onClick: (ex: ExamenCompleto) => void;
}

export const ExamenCard = ({ ex, tieneAcceso, esFavorito, onToggleFav, onClick }: Props) => {
  const data = perfectExamenData(ex);
  const variant = VARIANT_CONFIG[data.variant];
  const Icon = variant.icon;
  const [abierta, setAbierta] = useState(false);

  // 🔓 Un examen se considera "desbloqueado" visualmente si:
  // el usuario tiene suscripción, es demo, o está en la lista de gratuitos especiales
  const esGratis = EXAMENES_GRATUITOS_IDS.includes(ex.id) || ex.es_demo;
  const accesoReal = tieneAcceso || esGratis;

  // Función para manejar el inicio seguro y evitar interferir con favoritos/acordeón
  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(ex);
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-[20px] overflow-hidden shadow-[0_4px_25px_rgba(0,0,0,0.05)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.1)] border border-slate-200/60 transition-all duration-300 hover:-translate-y-2">

      {/* ========================================= */}
      {/* 1. PORTADA MINEDU OFICIAL */}
      {/* ========================================= */}
      <div className="w-full flex flex-col shrink-0 select-none" style={{ height: '280px' }}>

        {/* Franja superior rayada */}
        <div
          className="h-7 w-full opacity-90"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #3f3f3f, #3f3f3f 7px, #2a2a2a 7px, #2a2a2a 14px)' }}
        />

        {/* Cabecera de color dinámico */}
        <div
          className="px-6 py-2 text-white font-sans font-black italic tracking-tight text-[13px] flex items-center"
          style={{ backgroundColor: variant.accent }}
        >
          <span className="mr-1 text-[16px] font-normal leading-none">»</span>Evaluación Docente
        </div>

        {/* Bloque Gris Oscuro */}
        <div className="bg-[#757677] text-white px-7 pt-6 pb-6 flex flex-col">
          <h2 className="text-[18px] font-serif leading-tight tracking-wide font-normal italic opacity-80">
            Educación Básica Regular
          </h2>

          {/* TÍTULO CLICKEABLE (Código y Área/Nivel) */}
          <button
            onClick={handleStart}
            className="text-left group/title transition-all active:scale-95 mt-1"
          >
            <h3 className="text-[19px] font-serif leading-tight tracking-wide font-black uppercase group-hover/title:text-cyan-300">
              COD: <span className="text-white border-b-2 border-white/40">{data.codigo}</span>
            </h3>
            <h3 className="text-[17px] font-serif leading-tight font-normal mt-1 opacity-90 group-hover/title:translate-x-1 transition-transform">
              {data.area || `Nivel ${data.nivel}`}
            </h3>
          </button>
        </div>

        {/* Bloque Gris Claro */}
        <div className="bg-[#d9d9d9] text-[#363636] px-7 pt-6 pb-7 flex-1 flex flex-col justify-start">
          {/* TÍTULO CLICKEABLE (Tipo de Proceso) */}
          <button onClick={handleStart} className="text-left w-max active:scale-95 transition-transform">
            <h2 className="text-[22px] font-serif leading-tight font-black uppercase text-slate-800 hover:text-blue-700">
              {data.tipoProceso}
            </h2>
          </button>
          <h3 className="text-[20px] font-serif leading-tight font-normal text-slate-600 mt-0.5">
            Educación Básica
          </h3>

          <span
            className="mt-5 text-white px-3 py-1 text-[12px] font-sans font-black w-max shadow-md uppercase tracking-widest"
            style={{ backgroundColor: variant.accentDark }}
          >
            Convocatoria {data.anio}
          </span>
        </div>
      </div>

      {/* ========================================= */}
      {/* 2. METADATOS Y ACCIONES */}
      {/* ========================================= */}
      <div className="flex flex-col p-6 bg-white border-t border-slate-100 flex-1">

        {/* Insignia y Favorito */}
        <div className="flex items-center justify-between mb-5">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-[0.1em]"
            style={{ backgroundColor: variant.accentSoft, color: variant.accent }}
          >
            <Icon size={14} strokeWidth={3} /> {variant.label}
          </div>

          {onToggleFav && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFav(e, ex.id); }}
              className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors"
            >
              <Bookmark
                size={22}
                fill={esFavorito ? 'currentColor' : 'none'}
                className={esFavorito ? 'text-amber-500' : ''}
              />
            </button>
          )}
        </div>

        {/* Metadatos */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" /> Nivel: <span className="text-slate-900">{data.nivel}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-slate-400" /> Cuadernillo Oficial
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-slate-400" /> MINEDU
          </div>
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-slate-400" /> {data.duracion} min
          </div>
        </div>

        {/* Temario Expandible */}
        {ex.descripcion && (
          <div className="mt-4 pt-4 border-t border-slate-50">
            <button
              onClick={(e) => { e.stopPropagation(); setAbierta(!abierta); }}
              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
            >
              {abierta ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              {abierta ? 'Ocultar temario' : 'Ver detalles del cuadernillo'}
            </button>
            {abierta && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-3 rounded-2xl bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-600 border border-slate-100 shadow-inner italic"
              >
                {ex.descripcion}
              </div>
            )}
          </div>
        )}

        {/* Botón Principal de Acción */}
        <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
            {accesoReal ? 'Simulacro Listo' : 'Solo Suscriptores'}
          </span>

          <button
            onClick={handleStart}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[13px] font-black transition-all transform active:scale-95 ${
              accesoReal
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 hover:bg-black text-white shadow-lg shadow-slate-900/20'
            }`}
          >
            {accesoReal ? 'INICIAR SIMULACRO' : 'DESBLOQUEAR'}
            {accesoReal ? <Unlock size={14} /> : <Lock size={14} />}
          </button>
        </div>

      </div>
    </div>
  );
};