//frontend > src > components > marketing > Footer.tsx

"use client";
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Columna 1: Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <img src="https://docentesmart.vercel.app/favicon.svg" alt="DocenteSmart" className="w-8 h-8" />
              <span className="text-xl font-black text-blue-900">DocenteSmart</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              Acompañamos al magisterio peruano con tecnología y pedagogía para asegurar su éxito en la carrera docente.
            </p>
          </div>

          {/* Columna 2: Recursos SEO */}
          <div>
            <h4 className="font-black text-blue-900 text-sm uppercase tracking-widest mb-6">Recursos</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-500">
              <li><Link href="/examenes" className="hover:text-blue-600 transition-colors">Nombramiento Docente</Link></li>
              <li><Link href="/examenes" className="hover:text-blue-600 transition-colors">Ascenso de Escala</Link></li>
              <li><Link href="/examenes" className="hover:text-blue-600 transition-colors">Acceso a Directivos</Link></li>
            </ul>
          </div>

          {/* Columna 3: Soporte */}
          <div>
            <h4 className="font-black text-blue-900 text-sm uppercase tracking-widest mb-6">Soporte</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-500">
              <li><Link href="https://wa.me/51999999999" className="hover:text-blue-600 transition-colors">Centro de Ayuda</Link></li>
              <li><Link href="/aprendizaje" className="hover:text-blue-600 transition-colors">Cómo funciona</Link></li>
              <li><Link href="https://chat.whatsapp.com/TU_LINK" className="hover:text-blue-600 transition-colors text-emerald-600">Grupo de WhatsApp</Link></li>
            </ul>
          </div>

          {/* Columna 4: Legal */}
          <div>
            <h4 className="font-black text-blue-900 text-sm uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-500">
              <li><Link href="/terminos" className="hover:text-blue-600 transition-colors">Términos y Condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-blue-600 transition-colors">Privacidad</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs font-bold uppercase tracking-widest">
          <p>© 2024 DocenteSmart. Todos los derechos reservados.</p>
          <p>Hecho con ❤️ en Perú para el magisterio.</p>
        </div>
      </div>
    </footer>
  );
};