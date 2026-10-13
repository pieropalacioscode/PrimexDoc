'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Lock,
  Crown,
  MessageCircle,
  X,
  Sparkles,
  Zap,
  Target,
  Check,
  ShieldCheck,
  Flame,
  BadgeCheck
} from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  examenTitulo?: string;
}

type PlanId = 'mensual' | 'semestral' | 'anual';

interface Plan {
  id: PlanId;
  etiqueta: string;
  duracion: string;
  precioTotal: number;
  precioMes: number;
  ahorroPct: number;
  badge?: string;
  destacado?: boolean;
}

const PLANES: Plan[] = [
  {
    id: 'mensual',
    etiqueta: 'Mensual',
    duracion: '30 días',
    precioTotal: 7,
    precioMes: 7,
    ahorroPct: 0,
  },
  {
    id: 'semestral',
    etiqueta: 'Semestral',
    duracion: '6 meses',
    precioTotal: 15,
    precioMes: 2.5,
    ahorroPct: 64,
    badge: 'Más elegido',
  },
  {
    id: 'anual',
    etiqueta: 'Anual',
    duracion: '12 meses',
    precioTotal: 25,
    precioMes: 2.08,
    ahorroPct: 70,
    badge: 'Mejor precio',
    destacado: true,
  },
];

const WHATSAPP_BASE = 'https://wa.me/pieropalacios.neo';
const DURACION_OFERTA_SEGUNDOS = 24 * 60 * 60; // 24 horas

function formatTiempo(totalSegundos: number) {
  const h = Math.floor(totalSegundos / 3600);
  const m = Math.floor((totalSegundos % 3600) / 60);
  const s = totalSegundos % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function PaywallModal({ isOpen, onClose, examenTitulo }: PaywallModalProps) {
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanId>('anual');
  const [mounted, setMounted] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(DURACION_OFERTA_SEGUNDOS);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cuenta regresiva de la oferta (refuerza urgencia mientras el modal está abierto)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSegundosRestantes((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Bloquea el scroll del body mientras el modal está abierto (web y móvil)
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const { overflow, position, top, width } = document.body.style;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !mounted) return null;

  const plan = PLANES.find((p) => p.id === planSeleccionado)!;

  const getWhatsAppLink = () => {
    const text = `Hola PrimexDoc, quiero activar mi acceso Premium ahora.
Plan elegido: ${plan.etiqueta} (${plan.duracion}) - S/ ${plan.precioTotal}.
${examenTitulo ? `Examen de interés: ${examenTitulo}` : ''}`;

    return `${WHATSAPP_BASE}?text=${encodeURIComponent(text)}`;
  };

  const beneficios = [
    { icon: Target, text: 'Acceso ilimitado a todos los simulacros' },
    { icon: Zap, text: 'Retroalimentación pedagógica al instante' },
    { icon: Sparkles, text: 'Claves oficializadas y verificadas' },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-titulo"
    >
      <div
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-[28px] sm:rounded-[32px] w-full max-w-lg shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[94dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 w-full shrink-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all border border-slate-100"
        >
          <X size={18} />
        </button>

        <div className="p-5 pt-14 sm:p-9 sm:pt-10 overflow-y-auto custom-scrollbar overscroll-contain">

          {/* Barra de urgencia */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs sm:text-sm font-black rounded-2xl py-2.5 px-4 mb-6 text-center">
            <span className="inline-flex items-center gap-1.5">
              <Flame size={14} className="fill-orange-500 text-orange-500 shrink-0" />
              <span className="uppercase tracking-wide">Oferta termina en</span>
            </span>
            <span className="font-mono tabular-nums text-orange-900 bg-white/70 px-2 py-0.5 rounded-lg">
              {formatTiempo(segundosRestantes)}
            </span>
          </div>

          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-blue-50 text-blue-600 mb-4">
              <Crown size={28} className="fill-blue-600/20 sm:w-8 sm:h-8" />
            </div>
            <h2 id="paywall-titulo" className="text-xl sm:text-3xl font-black text-slate-900 leading-snug sm:leading-tight px-1">
              Deja de perder puntos por <span className="text-blue-600">no practicar</span>
            </h2>
            <p className="text-slate-500 font-medium mt-3 text-sm sm:text-base leading-relaxed px-1">
              Miles de docentes ya usan Premium para llegar seguros al examen de Nombramiento. Elige tu plan y entra ahora mismo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 mb-7">
            {beneficios.map((b, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="bg-white p-2 rounded-xl text-blue-600 shadow-sm shrink-0">
                  <b.icon size={18} />
                </div>
                <span className="text-sm font-bold text-slate-700 leading-snug">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Selector de planes estilo Hostinger */}
          <div className="space-y-3 mb-3">
            {PLANES.map((p) => {
              const activo = planSeleccionado === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlanSeleccionado(p.id)}
                  className={`sun-sheen-wrapper w-full relative text-left p-4 rounded-[20px] border-2 transition-all flex items-center gap-3 sm:gap-4 ${
                    activo
                      ? 'border-blue-600 bg-blue-50/60 shadow-lg ring-4 ring-blue-600/10'
                      : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  {activo && <span className="sun-sheen" aria-hidden="true" />}

                  {/* radio */}
                  <div
                    className={`shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      activo ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {activo && <Check size={12} className="text-white sm:w-3.5 sm:h-3.5" strokeWidth={3} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                      <p className={`font-black leading-tight ${activo ? 'text-blue-900' : 'text-slate-800'}`}>
                        {p.etiqueta}
                      </p>
                      {p.badge && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full leading-none whitespace-nowrap ${
                            p.destacado ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'
                          }`}
                        >
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{p.duracion}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className={`text-lg sm:text-2xl font-black ${activo ? 'text-blue-600' : 'text-slate-900'}`}>
                        S/{p.precioMes.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">/mes</span>
                    </div>
                    {p.ahorroPct > 0 ? (
                      <p className="text-[10px] font-black text-emerald-600 uppercase mt-0.5">
                        Ahorras {p.ahorroPct}%
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sin descuento</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-slate-400 font-semibold mb-7 px-2 leading-relaxed">
            Pago único de <span className="text-slate-600 font-black">S/ {plan.precioTotal}</span> por {plan.duracion}, sin renovación automática.
          </p>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse" />

            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="sun-sheen-wrapper relative w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black py-4 sm:py-5 px-5 sm:px-6 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2.5 sm:gap-3 text-center text-[13px] sm:text-sm uppercase tracking-wide sm:tracking-[0.1em] active:scale-[0.98] leading-snug"
            >
              <span className="sun-sheen" aria-hidden="true" />
              <MessageCircle size={20} className="fill-white/20 shrink-0" />
              <span>Quiero mi acceso Premium ahora</span>
            </a>
          </div>

          {/* Seguridad y confianza */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1.5 text-center py-2">
              <Lock size={17} className="text-slate-400" />
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-tight leading-tight">Pago cifrado</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center py-2 border-x border-slate-100">
              <ShieldCheck size={17} className="text-slate-400" />
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-tight leading-tight">Acceso garantizado</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center py-2">
              <BadgeCheck size={17} className="text-slate-400" />
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-tight leading-tight">Yape / Plin</span>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .sun-sheen-wrapper {
          position: relative;
          overflow: hidden;
        }
        .sun-sheen {
          position: absolute;
          top: 0;
          left: -60%;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.65) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-20deg);
          animation: sun-sheen-move 2.6s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes sun-sheen-move {
          0% {
            left: -60%;
          }
          40% {
            left: 130%;
          }
          100% {
            left: 130%;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}