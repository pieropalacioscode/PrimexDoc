'use client';

import React, { useState } from 'react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  examenTitulo?: string;
}

export default function PaywallModal({ isOpen, onClose, examenTitulo }: PaywallModalProps) {
  const [planSeleccionado, setPlanSeleccionado] = useState<'mensual' | 'semestral' | 'anual'>('semestral');

  if (!isOpen) return null;

  const PHONE_NUMBER = '51999999999'; // Modificar con el número oficial de WhatsApp PrimexDoc

  const getWhatsAppLink = () => {
    const planesText = {
      mensual: 'Plan Mensual (S/ 7)',
      semestral: 'Plan Semestral (S/ 15 - Oferta Especial)',
      anual: 'Plan Anual (S/ 25)',
    };

    const text = `Hola PrimexDoc, deseo activar mi suscripción para acceder a los simulacros.
Plan elegido: ${planesText[planSeleccionado]}.
${examenTitulo ? `Examen de interés: ${examenTitulo}` : ''}`;

    return `https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors"
        >
          ✕
        </button>

        {/* Encabezado */}
        <div className="text-center mb-6">
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
            🔒 Contenido Premium
          </span>
          <h2 className="text-2xl font-bold text-slate-800">
            Desbloquea el Acceso Ilimitado
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Prepárate con simulacros completos, claves oficializadas y retroalimentación pedagógica.
          </p>
        </div>

        {/* Opciones de Planes */}
        <div className="space-y-3 mb-6">
          
          {/* Mensual */}
          <div
            onClick={() => setPlanSeleccionado('mensual')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
              planSeleccionado === 'mensual'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <p className="font-bold text-slate-800">Plan Mensual</p>
              <p className="text-xs text-slate-500">Acceso completo por 30 días</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-slate-800">S/ 7</p>
              <p className="text-[10px] text-slate-400">mensual</p>
            </div>
          </div>

          {/* Semestral (ANCLA / SWEET SPOT) */}
          <div
            onClick={() => setPlanSeleccionado('semestral')}
            className={`cursor-pointer p-4 rounded-2xl border-2 relative transition-all flex items-center justify-between ${
              planSeleccionado === 'semestral'
                ? 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-600/20'
                : 'border-blue-300 bg-blue-50/20 hover:border-blue-400'
            }`}
          >
            <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Más Popular ★
            </span>
            <div>
              <p className="font-bold text-slate-900">Plan Semestral (6 Meses)</p>
              <p className="text-xs text-blue-700 font-medium">Recomendado para la Nombramiento EBR</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-blue-700">S/ 15</p>
              <p className="text-[10px] text-slate-500">S/ 2.50/mes</p>
            </div>
          </div>

          {/* Anual */}
          <div
            onClick={() => setPlanSeleccionado('anual')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
              planSeleccionado === 'anual'
                ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <p className="font-bold text-slate-800">Plan Anual (12 Meses)</p>
              <p className="text-xs text-slate-500">Ahorro máximo para todo el año</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-slate-800">S/ 25</p>
              <p className="text-[10px] text-slate-400">S/ 2.08/mes</p>
            </div>
          </div>

        </div>

        {/* CTA WhatsApp */}
        <a
          href={getWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-2xl transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-center text-sm"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
          Activar por Yape / Plin vía WhatsApp
        </a>

        <p className="text-center text-[11px] text-slate-400 mt-3">
          Activación inmediata tras confirmación del comprobante por WhatsApp.
        </p>

      </div>
    </div>
  );
}