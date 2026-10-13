'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  LayoutDashboard,
  History,
  Bookmark,
  GraduationCap,
  LogOut,
  ChevronRight,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { resolverNombreDocente } from '@/utils/nombreDocente';

export const Sidebar = () => {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const { label: nombreDocente, isLoading: nombreCargando } = useMemo(
    () => resolverNombreDocente(user),
    [user]
  );

  const menuItems = [
    { name: 'Simulacros', shortName: 'Simulacros', href: '/examenes', icon: LayoutDashboard },
    { name: 'Mi Historial', shortName: 'Historial', href: '/resultados', icon: History },
    { name: 'Mis Guardados', shortName: 'Guardados', href: '/mis-guardados', icon: Bookmark },
    { name: 'Aprendizaje', shortName: 'Aprender', href: '/aprendizaje', icon: GraduationCap },
    { name: 'Mi Perfil', shortName: 'Perfil', href: '/perfil', icon: User },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <>
      {/* =========================================
          SIDEBAR DESKTOP
      ========================================= */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-40 transition-all duration-300">

        {/* Logo */}
        <Link href="/examenes" className="p-8 flex items-center gap-3 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl">
          <img
            src="https://res.cloudinary.com/ubjx67e4/image/upload/v1789429302/logo-docente-smart-simulacro-examenes-docente-peru-minedu.png"
            alt="DocenteSmart"
            className="w-10 h-10 object-contain"
          />
          <span className="font-black text-xl text-slate-800 tracking-tighter italic">
            Docente <span className="text-blue-600">Smart</span>
          </span>
        </Link>

        {/* Navegación */}
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            // Verifica si es la ruta exacta o una sub-ruta
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={20}
                    className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}
                  />
                  {item.name}
                </div>
                {isActive && <ChevronRight size={14} className="text-blue-200" />}
              </Link>
            );
          })}
        </nav>

        {/* Perfil y Logout */}
        <div className="p-6 border-t border-slate-50 bg-white">
          <Link
            href="/perfil"
            className={`flex flex-col bg-slate-50 rounded-2xl p-4 mb-4 border transition-all hover:border-blue-200 group focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              pathname.startsWith('/perfil') ? 'border-blue-600 bg-blue-50' : 'border-slate-100'
            }`}
          >
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-blue-400">
              Docente Conectado
            </p>
            <div className="flex items-center justify-between">
              {nombreCargando ? (
                <div className="h-3.5 w-28 rounded-full bg-slate-200 animate-pulse" />
              ) : (
                <p
                  className="text-xs font-bold text-slate-700 truncate mr-2"
                  title={nombreDocente}
                >
                  {nombreDocente}
                </p>
              )}
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
            </div>
          </Link>

          <button
            onClick={handleLogout}
            aria-label="Cerrar Sesión"
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>

          <div className="mt-4 pt-4 border-t border-slate-50">
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 opacity-40 hover:opacity-100 transition-opacity">
              <Link href="/terminos" className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-tighter">
                Términos
              </Link>
              <Link href="/privacidad" className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-tighter">
                Privacidad
              </Link>
              <Link href="/reclamaciones" className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-tighter">
                Reclamos
              </Link>
            </div>
            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-2">
              RUC: 20613771591
            </p>
          </div>
        </div>
        </aside>

      {/* =========================================
          NAVEGACIÓN MÓVIL (Bottom Bar 5 Ítems)
      ========================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-center z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center w-full py-2 px-1 rounded-2xl transition-all gap-1 ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-50' : 'bg-transparent'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] truncate max-w-full ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.shortName}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};