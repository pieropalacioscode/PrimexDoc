// src/app/page.tsx
import { Hero } from '@/components/marketing/Hero';
import { Features } from '@/components/marketing/Features';
import { WhatsappButton } from '@/components/marketing/WhatsappButton';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Navbar Universal (Detecta si hay sesión) */}
      <Navbar />
      
      <main className="flex-grow">
        {/* Secciones de impacto SEO */}
        <Hero />
        <Features />
        
        {/* Sección de Precios (Opcional ponerla aquí directamente) */}
        <section id="precios" className="py-20 bg-slate-50">
           <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-3xl font-black text-slate-900 mb-8 uppercase tracking-tighter">
                Invierte en tu <span className="text-blue-600">Nombramiento</span>
              </h2>
              <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-900 shadow-2xl inline-block w-full max-w-md">
                 <p className="font-bold text-slate-400 uppercase text-xs mb-2">Plan Acceso Total</p>
                 <p className="text-6xl font-black text-blue-900 mb-6">S/ 49<span className="text-xl">.90</span></p>
                 <ul className="text-left space-y-3 mb-8 font-medium text-slate-600">
                    <li className="flex items-center gap-2">✅ Simulacros Ilimitados</li>
                    <li className="flex items-center gap-2">✅ Analítica de Desempeño</li>
                    <li className="flex items-center gap-2">✅ Descarga de PDFs</li>
                 </ul>
                 <a href="https://wa.me/51999999999" className="block w-full bg-blue-900 text-white py-4 rounded-2xl font-black hover:scale-105 transition-transform">
                   Activar por WhatsApp
                 </a>
              </div>
           </div>
        </section>
      </main>

      <Footer />
      <WhatsappButton />
    </div>
  );
}