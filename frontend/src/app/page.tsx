// app/page.tsx
import Link from 'next/link';
import { fetchAPI } from '@/services/api';
import { Noticia, getNoticiaImagen } from '@/types';
import { Hero } from '@/components/marketing/Hero';
import { Features } from '@/components/marketing/Features';
import { WhatsappButton } from '@/components/marketing/WhatsappButton';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Check, Sparkles } from 'lucide-react';
import { FaqSection } from '@/components/seo/FaqSection';

// Constantes y tipos para la sección de Precios
const WHATSAPP_BASE = 'https://wa.me/pieropalacios.neo';
export const revalidate = 60;
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
    destacado: true,
  },
  {
    id: 'anual',
    etiqueta: 'Anual',
    duracion: '12 meses',
    precioTotal: 25,
    precioMes: 2.08,
    ahorroPct: 70,
    badge: 'Mejor precio',
  },
];

const BENEFICIOS_COMUNES = [
  'Simulacros e intentos ilimitados',
  'Analítica y reporte de debilidades',
  'Claves oficializadas con sustento MINEDU',
];

function getWhatsAppLink(plan: Plan) {
  const text = `Hola PrimexDoc, quiero activar mi acceso Premium.\nPlan elegido: ${plan.etiqueta} (${plan.duracion}) - S/ ${plan.precioTotal}.`;
  return `${WHATSAPP_BASE}?text=${encodeURIComponent(text)}`;
}

// Componente Principal Server-Side
export default async function HomePage() {
  // Traemos las últimas 3 noticias para la Home
  const noticias = await fetchAPI<Noticia[]>('/noticias?limit=3').catch(() => []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar Universal */}
      <Navbar />

      <main className="flex-grow">
        {/* Hero Principal */}
        <Hero />

        {/* Características y Servicios */}
        <Features />

      {/* SECCIÓN DE NOTICIAS EN HOME */}
      {noticias.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                  Actualidad <span className="text-cyan-600">Docente</span>
                </h2>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-2">
                  Cronogramas, claves y comunicados oficiales MINEDU
                </p>
              </div>
              <Link href="/noticias" className="hidden sm:block text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
                Ver todas →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {noticias.map((n) => (
                <Link key={n.id} href={`/noticias/${n.slug}`} className="group block">
                  <div className="relative h-48 rounded-[24px] overflow-hidden mb-4 border border-slate-100 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getNoticiaImagen(n.banner_filename)}
                      alt={n.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{n.categoria}</span>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mt-1 group-hover:text-blue-600 transition-colors uppercase italic">
                    {n.titulo}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
        {/* SECCIÓN DE PRECIOS */}
        <section id="precios" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">

            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-[11px] sm:text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest mb-5 sm:mb-6">
              <Sparkles size={14} className="text-blue-600 shrink-0" />
              <span>Planes Accesibles 2026</span>
            </div>

            <h2 className="text-2xl sm:text-5xl font-black text-slate-900 mb-4 sm:mb-6 tracking-tight leading-snug sm:leading-tight px-2">
              Invierte en tu <span className="text-blue-600 italic">Ascenso</span>
            </h2>
            <p className="text-slate-600 font-medium text-sm sm:text-lg mb-10 sm:mb-14 max-w-xl mx-auto leading-relaxed px-2">
              Accede a todos los simulacros inteligentes, banco de preguntas con claves MINEDU y analítica de desempeño.
            </p>

            {/* Grid de planes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 items-stretch text-left">
              {PLANES.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col p-6 sm:p-7 rounded-[28px] border-2 bg-white transition-all ${
                    plan.destacado
                      ? 'border-blue-600 shadow-xl sm:scale-[1.04] sm:z-10'
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  {plan.badge && (
                    <div
                      className={`absolute top-0 right-6 -translate-y-1/2 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest whitespace-nowrap ${
                        plan.destacado ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                      }`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <p className={`font-black uppercase text-xs tracking-widest mb-2 ${plan.destacado ? 'text-blue-600' : 'text-slate-500'}`}>
                    Plan {plan.etiqueta}
                  </p>

                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl sm:text-5xl font-black text-slate-900">
                      S/{plan.precioMes.toFixed(2)}
                    </span>
                    <span className="text-slate-400 font-bold text-sm">/mes</span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mb-1">
                    Pago único de S/ {plan.precioTotal} por {plan.duracion}
                  </p>
                  {plan.ahorroPct > 0 && (
                    <p className="text-xs font-black text-emerald-600 uppercase mb-5">
                      Ahorras {plan.ahorroPct}%
                    </p>
                  )}
                  {plan.ahorroPct === 0 && <div className="mb-5" />}

                  <ul className="space-y-3 mb-7 text-sm font-bold text-slate-700 flex-grow">
                    {BENEFICIOS_COMUNES.map((beneficio) => (
                      <li key={beneficio} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0 mt-0.5">
                          <Check size={12} strokeWidth={3} />
                        </div>
                        <span className="leading-snug">{beneficio}</span>
                      </li>
                    ))}
                  </ul>

                  <a
                    href={getWhatsAppLink(plan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center py-4 rounded-2xl font-black transition-all text-[13px] sm:text-sm uppercase tracking-wide sm:tracking-wider ${
                      plan.destacado
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    Activar por WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
          <FaqSection/>
      </main>

      <Footer />
      <WhatsappButton />
    </div>
  );
}