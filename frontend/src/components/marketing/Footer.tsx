"use client";
import Link from 'next/link';
import { BookOpenCheck, ShieldCheck, MessageCircle } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 pt-14 sm:pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 md:gap-12 mb-12">

          {/* Columna 1: Brand & Socials — ocupa el ancho completo en móvil */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <img src="https://docentesmart.vercel.app/favicon.svg" alt="DocenteSmart" className="w-8 h-8" />
              <span className="text-xl font-black text-blue-900">DocenteSmart</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed font-medium max-w-sm mb-6">
              Acompañamos al magisterio peruano con tecnología y pedagogía para asegurar su éxito en la carrera docente.
            </p>

            {/* Redes Sociales Integradas */}
            <div className="flex items-center gap-4">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/profile.php?id=61591243875708"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 bg-slate-50 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-all"
                aria-label="Facebook de DocenteSmart"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/docentesmartperu/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 bg-slate-50 rounded-lg hover:text-pink-600 hover:bg-pink-50 transition-all"
                aria-label="Instagram de DocenteSmart"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@docentesmartperu"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 bg-slate-50 rounded-lg hover:text-black hover:bg-slate-100 transition-all"
                aria-label="TikTok de DocenteSmart"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.96-.55 3.91-1.72 5.39-1.16 1.48-2.85 2.5-4.7 2.82-1.85.32-3.83.05-5.5-1.02-1.67-1.06-2.85-2.73-3.23-4.67-.39-1.94-.1-3.99.98-5.63 1.07-1.64 2.7-2.77 4.59-3.21 1.88-.44 3.91-.22 5.58.74V4.76c-1.3-.01-2.6-.01-3.9-.01v4.02c.65.01 1.3.01 1.95.01v4.02c-.89-.47-2.02-.45-2.88.08-.86.54-1.35 1.52-1.22 2.52.13 1 .84 1.83 1.78 2.08.95.25 1.99-.03 2.68-.7.69-.67 1.05-1.66 1.05-2.62V.02z"/>
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/pieropalacios.neo"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 bg-slate-50 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                aria-label="WhatsApp de DocenteSmart"
              >
                <MessageCircle size={20} strokeWidth={2.5} />
              </a>
            </div>
          </div>

          {/* Columna 2: Recursos SEO */}
          <div>
            <h4 className="font-black text-blue-900 text-xs sm:text-sm uppercase tracking-widest mb-4 sm:mb-6">Recursos</h4>
            <ul className="space-y-3 sm:space-y-4 text-sm font-bold text-slate-500">
              <li><Link href="/examenes" className="hover:text-blue-600 transition-colors">Nombramiento Docente</Link></li>
              <li><Link href="/examenes" className="hover:text-blue-600 transition-colors">Ascenso de Escala</Link></li>
              <li><Link href="/noticias" className="hover:text-blue-600 transition-colors">Noticias</Link></li>
            </ul>
          </div>

          {/* Columna 3: Soporte */}
          <div>
            <h4 className="font-black text-blue-900 text-xs sm:text-sm uppercase tracking-widest mb-4 sm:mb-6">Soporte</h4>
            <ul className="space-y-3 sm:space-y-4 text-sm font-bold text-slate-500">
              <li><Link href="/aprendizaje" className="hover:text-blue-600 transition-colors">Aprendizaje</Link></li>
              <li><Link href="https://chat.whatsapp.com/BkkgDKJBkYcJSxMdUNkW0o" className="hover:text-emerald-600 text-emerald-600 transition-colors">Grupo de WhatsApp</Link></li>
            </ul>
          </div>

          {/* Columna 4: Legal + Libro de Reclamaciones */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="font-black text-blue-900 text-xs sm:text-sm uppercase tracking-widest mb-4 sm:mb-6">Legal</h4>
            <ul className="space-y-3 sm:space-y-4 text-sm font-bold text-slate-500 mb-5">
              <li><Link href="/terminos" className="hover:text-blue-600 transition-colors">Términos y Condiciones</Link></li>
              <li><Link href="/privacidad" className="hover:text-blue-600 transition-colors">Privacidad</Link></li>
            </ul>

            <Link
              href="/reclamaciones"
              className="inline-flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50 hover:border-amber-100 transition-all group w-full sm:w-auto"
            >
              <BookOpenCheck
                className="w-7 h-7 sm:w-8 sm:h-8 text-slate-500 group-hover:text-amber-600 transition-colors shrink-0"
              />
              <span className="text-[10px] font-black text-slate-500 group-hover:text-amber-700 uppercase leading-tight">
                Libro de<br />Reclamaciones
              </span>
            </Link>
          </div>
        </div>

        {/* Bloque legal obligatorio (RUC / Razón Social) */}
        <div className="pt-8 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-between gap-3 sm:gap-6 text-center sm:text-left mb-6">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck size={14} className="shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest">
                Grupo Empresarial Kelpad S.R.L. · RUC 20613771591
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-3 text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            <p>© 2026 DocenteSmart / PrimexDoc. Todos los derechos reservados.</p>
            <p>Hecho con ❤️ en Perú para el magisterio.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};