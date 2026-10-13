'use client';

import React from 'react';
import { ShieldAlert, MonitorSmartphone, X, ArrowRight } from 'lucide-react';

interface SessionLimitModalProps {
  onClose: () => void;
}

export default function SessionLimitModal({ onClose }: SessionLimitModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl shadow-slate-900/20 border border-slate-100 p-8 animate-in zoom-in-95 duration-200">
        {/* Botón de cerrar superior */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-300 hover:text-slate-500 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Icono de Alerta de Seguridad */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6 shadow-sm">
          <ShieldAlert className="text-amber-500" size={32} />
        </div>

        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-3 italic">
          LÍMITE DE <br /> <span className="text-amber-600">SESIONES ALCANZADO</span>
        </h2>

        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
          Tu cuenta ha alcanzado el límite máximo de <b>2 dispositivos</b> conectados simultáneamente.
        </p>

        {/* Info Box Inteligente */}
        <div className="flex items-start gap-3 bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100">
          <MonitorSmartphone className="text-blue-500 shrink-0 mt-0.5" size={18} />
          <p className="text-[11px] text-slate-600 font-bold leading-tight uppercase tracking-tight">
            Para proteger tu cuenta, hemos cerrado automáticamente tu sesión más antigua en otro dispositivo.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 hover:bg-blue-600 active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
        >
          Entendido, continuar <ArrowRight size={14} />
        </button>

        <p className="mt-6 text-center text-[9px] text-slate-300 font-black uppercase tracking-[0.2em]">
          DocenteSmart Security Shield
        </p>
      </div>
    </div>
  );
}