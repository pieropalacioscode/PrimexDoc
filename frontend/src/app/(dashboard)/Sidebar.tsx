// src/components/dashboard/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  History,
  Bookmark,
  GraduationCap,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const Sidebar = () => {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const menuItems = [
    {
      name: 'Simulacros',
      href: '/examenes',
      icon: LayoutDashboard,
    },
    {
      name: 'Mi Historial',
      href: '/resultados',
      icon: History,
    },
    {
      name: 'Mis Guardados',
      href: '/mis-guardados',
      icon: Bookmark,
    },
    {
      name: 'Aprendizaje',
      href: '/aprendizaje',
      icon: GraduationCap,
    },
  ];

  return (
    <>
      {/* =========================================
          SIDEBAR DESKTOP
      ========================================= */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-40 transition-all duration-300">
        
        {/* Logo */}
        <div className="p-8 flex items-center gap-3">
          <img
            src="https://docentesmart.vercel.app/favicon.svg"
            alt="DocenteSmart"
            className="w-10 h-10 object-contain"
          />

          <span className="font-black text-xl text-slate-800 tracking-tighter italic">
            DocenteSmart
          </span>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon
                    size={20}
                    className={
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-blue-600'
                    }
                  />

                  {item.name}
                </div>

                {isActive && (
                  <ChevronRight
                    size={14}
                    className="text-blue-200"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Perfil y Logout */}
        <div className="p-6 border-t border-slate-50">
          
          <div className="bg-slate-50 rounded-3xl p-4 mb-4 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">
              Usuario
            </p>

            <p className="text-xs font-bold text-slate-700 truncate px-1">
              {user?.nombre_completo || 'Docente'}
            </p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* =========================================
          NAVEGACIÓN MÓVIL
      ========================================= */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`p-2 rounded-xl ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-400'
              }`}
            >
              <item.icon size={24} />
            </Link>
          );
        })}
      </div>
    </>
  );
};