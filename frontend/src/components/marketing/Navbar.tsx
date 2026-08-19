"use client";
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Rocket, User, MessageCircle, GraduationCap, LayoutDashboard } from 'lucide-react';

export const Navbar = () => {
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-2 group">
            <img src="https://docentesmart.vercel.app/favicon.svg" alt="DocenteSmart" className="w-9 h-9 group-hover:rotate-12 transition-transform" />
            <span className="text-xl font-black text-blue-900 tracking-tighter">Docente<span className="text-cyan-600">Smart</span></span>
          </Link>

          {/* LINKS CENTRALES (Solo visibles en Desktop) */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
              Inicio
            </Link>
            <Link href="https://chat.whatsapp.com/TU_LINK" target="_blank" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <MessageCircle size={16} className="text-emerald-500" /> Comunidad
            </Link>
            <Link href="/aprendizaje" className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <GraduationCap size={16} className="text-blue-500" /> Aprendizaje
            </Link>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/examenes" className="bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-200">
                <LayoutDashboard size={16} /> PANEL DE CONTROL
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-600 hover:text-blue-900 px-4 py-2">
                  Ingresar
                </Link>
                <Link href="/registro" className="bg-blue-900 text-white px-6 py-3 rounded-2xl text-xs font-black flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100 active:scale-95 uppercase tracking-wide">
                  Empezar ahora <Rocket size={16} className="text-cyan-400" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};