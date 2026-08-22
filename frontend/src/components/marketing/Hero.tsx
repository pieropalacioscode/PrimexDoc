//frontend > src > components > marketing > Hero.tsx

import Link from 'next/link';
import { Rocket, ShieldCheck, PieChart } from 'lucide-react';

export const Hero = () => {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-widest mb-8 border border-blue-100">
            <ShieldCheck size={14} /> Plataforma Oficial 2024
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-tight tracking-tighter mb-8">
            Domina el examen de <br />
            <span className="text-blue-600 italic">Nombramiento Docente</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-12 font-medium leading-relaxed">
            Practica con simulacros inteligentes, obtén diagnósticos de tus debilidades y accede a sustentos pedagógicos oficiales del MINEDU.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/registro" className="w-full sm:w-auto bg-blue-900 text-white px-10 py-5 rounded-2xl text-lg font-black hover:bg-blue-800 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 active:scale-95">
              EMPEZAR AHORA <Rocket size={20} className="text-cyan-400" />
            </Link>
            <Link href="/login" className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-700 px-10 py-5 rounded-2xl text-lg font-black hover:bg-slate-50 transition-all text-center">
              Ya tengo cuenta
            </Link>
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><PieChart /></div>
              <p className="font-black text-2xl text-slate-900">+1,500</p>
              <p className="text-xs font-bold text-slate-400 uppercase">Docentes Preparándose</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><ShieldCheck /></div>
              <p className="font-black text-2xl text-slate-900">95%</p>
              <p className="text-xs font-bold text-slate-400 uppercase">Satisfacción</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4"><Rocket /></div>
              <p className="font-black text-2xl text-slate-900">100%</p>
              <p className="text-xs font-bold text-slate-400 uppercase">Actualizado MINEDU</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};