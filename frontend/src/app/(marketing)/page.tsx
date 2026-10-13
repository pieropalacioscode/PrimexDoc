// src/app/page.tsx
import { CheckCircle2, BarChart3, Zap, ShieldCheck, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

// ============================================================
// METADATA - Server Component permite exportar esto directamente
// ============================================================
export const metadata: Metadata = {
  title: 'Nombramiento Docente 2026 | Simulador Oficial MINEDU - DocenteSmart',
  description: 'Prepárate para el Nombramiento Docente y Ascenso de Escala 2026 con exámenes oficiales MINEDU, retroalimentación pedagógica instantánea y analítica de tus debilidades. Empieza gratis.',
  keywords: [
    'nombramiento docente 2026',
    'ascenso de escala magisterial',
    'simulacro minedu',
    'examen nombramiento docente peru',
    'preparación docente minedu',
  ],
  openGraph: {
    title: 'Asegura tu Nombramiento Docente con Inteligencia | DocenteSmart',
    description: 'Simulador oficial MINEDU con analítica avanzada para docentes peruanos. Simulacros ilimitados y sustento pedagógico oficial.',
    images: [
      {
        url: 'https://cdn.docentesmart.com/marketing/hero-dashboard.png',
        width: 1200,
        height: 630,
        alt: 'Dashboard del simulador DocenteSmart para Nombramiento Docente',
      },
    ],
    locale: 'es_PE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asegura tu Nombramiento Docente con Inteligencia | DocenteSmart',
    description: 'Simulacros oficiales MINEDU, analítica avanzada y sustento pedagógico. Prueba gratis.',
    images: ['https://cdn.docentesmart.com/marketing/hero-dashboard.png'],
  },
  alternates: {
    canonical: 'https://docentesmart.com',
  },
};

// ============================================================
// JSON-LD - Structured Data para rich results en Google
// ============================================================
function LandingJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'DocenteSmart',
    url: 'https://docentesmart.com',
    description: 'Plataforma de preparación para el Nombramiento Docente y Ascenso de Escala Magisterial en el Perú, con simulacros oficiales MINEDU.',
    areaServed: 'PE',
    offers: {
      '@type': 'Offer',
      name: 'Acceso Total DocenteSmart 2026',
      price: '49.90',
      priceCurrency: 'PEN',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ============================================================
// CONTACTO WHATSAPP - Configuración centralizada por username
// ============================================================

/**
 * Username público de WhatsApp (no el número telefónico).
 * NO coloques tu número telefónico aquí.
 */
const WHATSAPP_USERNAME = 'pieropalacios.neo';

/**
 * Genera el enlace de contacto usando el username público.
 *
 * Si WhatsApp te proporciona otro formato oficial de URL para
 * usernames, solo tendrás que modificar esta función.
 */
const createWhatsAppUrl = (message: string) => {
  return `https://wa.me/${WHATSAPP_USERNAME}?text=${encodeURIComponent(message)}`;
};

export default function LandingPage() {
  return (
    <main>
      <LandingJsonLd />

      {/* 1. HERO SECTION - SEO Target: Nombramiento Docente 2026 */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 text-center lg:text-left z-10">
            <span className="bg-cyan-100 text-cyan-700 text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest mb-6 inline-block">
              🔥 Proceso Docente 2026
            </span>

            {/* H1 único por página — clave para SEO */}
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
              Asegura tu <span className="text-blue-700 italic">Nombramiento Docente</span> con Inteligencia.
            </h1>

            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Practica con exámenes oficiales del MINEDU, obtén retroalimentación pedagógica al instante y descarga cuadernillos en PDF. Preparación para Nombramiento y Ascenso de Escala.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link
                href="/registro"
                className="w-full sm:w-auto bg-blue-900 text-white px-10 py-5 rounded-[2rem] text-lg font-black hover:bg-blue-800 transition-all shadow-2xl shadow-blue-200 text-center"
              >
                Iniciar Simulacro Gratis
              </Link>
              <Link
                href="#precios"
                className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-600 px-10 py-5 rounded-[2rem] text-lg font-black hover:bg-slate-50 transition-all text-center"
              >
                Ver Planes Pro
              </Link>
            </div>

            {/* Trust signal rápido — ayuda a conversión sin ser intrusivo */}
            <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Sin tarjeta de crédito • Acceso inmediato • +1,000 docentes preparándose
            </p>
          </div>

          <div className="lg:w-1/2 relative">
            <div className="relative rounded-[3rem] border-8 border-white shadow-2xl overflow-hidden bg-slate-200 aspect-video">
              <img
                src="https://cdn.docentesmart.com/marketing/hero-dashboard.png"
                alt="Panel del simulador DocenteSmart mostrando analítica de resultados para el examen de Nombramiento Docente MINEDU"
                className="object-cover w-full h-full"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                  98%
                </div>
                <p className="text-xs font-bold text-slate-500 leading-tight">
                  Docentes mejoran su<br />
                  <span className="text-slate-900 text-sm">Puntaje en 2 semanas</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURES - El valor de la Analítica */}
      <section id="caracteristicas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4">
              Mucho más que un PDF
            </h2>
            <p className="text-slate-500 font-medium max-w-2xl mx-auto">
              Herramientas diseñadas para el docente peruano que se prepara para el Nombramiento y Ascenso de Escala 2026.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                title: 'Simulador Pro',
                desc: 'Interfaz idéntica al examen real del MINEDU, con cronómetro y modo práctica sin límites.',
                icon: Zap,
                color: 'text-amber-500 bg-amber-50',
              },
              {
                title: 'Analítica Avanzada',
                desc: 'Gráficos de radar que detectan tus debilidades por componente: Comprensión Lectora, Matemática y más.',
                icon: BarChart3,
                color: 'text-blue-600 bg-blue-50',
              },
              {
                title: 'Sustento Oficial',
                desc: 'Cada respuesta incluye la explicación pedagógica verificada contra resoluciones oficiales del MINEDU.',
                icon: CheckCircle2,
                color: 'text-emerald-600 bg-emerald-50',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${f.color}`}
                >
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PRUEBA SOCIAL / CONFIANZA - Refuerza conversión antes del precio */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <ShieldCheck className="text-cyan-400" size={28} />
            <span className="text-cyan-400 font-black uppercase tracking-widest text-sm">
              Contenido verificado
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-black text-white mb-4 max-w-2xl mx-auto">
            Cada pregunta y explicación es validada contra Resoluciones Viceministeriales oficiales del MINEDU.
          </h2>
          <p className="text-slate-400 font-medium max-w-xl mx-auto">
            No usamos contenido genérico ni desactualizado. Si una fecha o norma cambia oficialmente, actualizamos la plataforma de inmediato.
          </p>
        </div>
      </section>

      {/* 4. PRICING - Estrategia Low Friction */}
      <section id="precios" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black text-slate-900 mb-16 italic underline decoration-cyan-400">
            Planes Simples para Docentes
          </h2>

          <div className="bg-white rounded-[3rem] border-4 border-blue-900 p-10 lg:p-16 shadow-2xl relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-900 text-cyan-400 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">
              Recomendado
            </div>
            <h3 className="text-2xl font-black mb-2">Acceso Total 2026</h3>
            <div className="flex items-center justify-center gap-1 my-8">
              <span className="text-2xl font-bold text-slate-400">S/</span>
              <span className="text-7xl font-black text-blue-900 tracking-tighter">49</span>
              <span className="text-lg font-bold text-slate-400">.90</span>
            </div>
            <ul className="text-left space-y-4 mb-10 max-w-xs mx-auto">
              {[
                'Simulacros Ilimitados',
                'Descarga de PDFs y Claves',
                'Analítica Pro y Diagnóstico',
                'Comunidad de WhatsApp VIP',
                'Soporte 24/7',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 font-bold text-slate-600">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <Link
              href={createWhatsAppUrl('Hola, deseo activar mi plan premium de DocenteSmart')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-900 text-white py-5 rounded-2xl text-xl font-black hover:bg-blue-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
            >
              <MessageCircle size={22} /> Activar vía WhatsApp
            </Link>
            <p className="mt-6 text-xs text-slate-400 font-bold uppercase tracking-widest">
              Pago único • Sin suscripciones mensuales
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}