"use client";
import { CheckCircle2, FileText, BarChart3, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main>
      {/* 1. HERO SECTION - SEO Target: Nombramiento Docente */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 text-center lg:text-left z-10">
            <span className="bg-cyan-100 text-cyan-700 text-xs font-black px-4 py-2 rounded-full uppercase tracking-widest mb-6 inline-block">
              🔥 Admisión 2024 - 2025
            </span>
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-8">
              Asegura tu <span className="text-blue-700 italic">Nombramiento</span> con Inteligencia.
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Practica con exámenes oficiales del MINEDU, obtén retroalimentación pedagógica al instante y descarga cuadernillos en PDF.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link href="/registro" className="w-full sm:w-auto bg-blue-900 text-white px-10 py-5 rounded-[2rem] text-lg font-black hover:bg-blue-800 transition-all shadow-2xl shadow-blue-200 text-center">
                Iniciar Simulacro Gratis
              </Link>
              <Link href="#precios" className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-600 px-10 py-5 rounded-[2rem] text-lg font-black hover:bg-slate-50 transition-all text-center">
                Ver Planes Pro
              </Link>
            </div>
          </div>
          
          <div className="lg:w-1/2 relative">
             {/* Aquí iría la imagen de tu R2: Muestra el Dashboard o el Simulador */}
             <div className="relative rounded-[3rem] border-8 border-white shadow-2xl overflow-hidden bg-slate-200 aspect-video">
                <img 
                  src="https://cdn.docentesmart.com/marketing/hero-dashboard.png" 
                  alt="Simulador DocenteSmart" 
                  className="object-cover w-full h-full"
                />
             </div>
             {/* Float Badge */}
             <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 hidden md:block">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                     98%
                   </div>
                   <p className="text-xs font-bold text-slate-500 leading-tight">Docentes mejoran su<br/><span className="text-slate-900 text-sm">Puntaje en 2 semanas</span></p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURES - El valor de la Analítica */}
      <section id="caracteristicas" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-black text-slate-900 mb-4">Mucho más que un PDF</h2>
            <p className="text-slate-500 font-medium">Herramientas diseñadas para el docente moderno.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { title: 'Simulador Pro', desc: 'Interface idéntica al examen real con cronómetro y modo práctica.', icon: Zap, color: 'text-amber-500 bg-amber-50' },
              { title: 'Analítica Avanzada', desc: 'Gráficos de radar que detectan tus debilidades por área.', icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
              { title: 'Sustento Oficial', desc: 'Cada respuesta incluye la explicación pedagógica del MINEDU.', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' }
            ].map((f, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${f.color}`}>
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-4">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. PRICING - Estrategia Low Friction */}
      <section id="precios" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black text-slate-900 mb-16 italic underline decoration-cyan-400">Planes Simples para Docentes</h2>
          
          <div className="bg-white rounded-[3rem] border-4 border-blue-900 p-10 lg:p-16 shadow-2xl relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-900 text-cyan-400 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">
              Recomendado
            </div>
            <h3 className="text-2xl font-black mb-2">Acceso Total 2024</h3>
            <div className="flex items-center justify-center gap-1 my-8">
              <span className="text-2xl font-bold text-slate-400">S/</span>
              <span className="text-7xl font-black text-blue-900 tracking-tighter">49</span>
              <span className="text-lg font-bold text-slate-400">.90</span>
            </div>
            <ul className="text-left space-y-4 mb-10">
              {['Simulacros Ilimitados', 'Descarga de PDFs y Claves', 'Analítica Pro y Diagnóstico', 'Comunidad de WhatsApp VIP', 'Soporte 24/7'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-bold text-slate-600">
                  <CheckCircle2 size={20} className="text-emerald-500" /> {item}
                </li>
              ))}
            </ul>
            <Link href="https://wa.me/51999999999?text=Deseo_activar_mi_plan_premium" className="w-full bg-blue-900 text-white py-5 rounded-2xl text-xl font-black hover:bg-blue-800 transition-all block shadow-lg shadow-blue-200">
              Activar vía WhatsApp ⚡
            </Link>
            <p className="mt-6 text-xs text-slate-400 font-bold uppercase tracking-widest">Pago único • Sin suscripciones mensuales</p>
          </div>
        </div>
      </section>
    </main>
  );
}