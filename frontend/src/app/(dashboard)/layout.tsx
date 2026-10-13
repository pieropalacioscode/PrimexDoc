//frontend > src > app > (dashboard) > layout.tsx >
import Link from 'next/link';
import { Sidebar } from './Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      {/* Contenido principal: respeta el ancho del sidebar en desktop
          y deja espacio abajo en móvil para la bottom bar */}
      <main className="lg:pl-64 pb-24 lg:pb-0 min-h-screen flex flex-col">
        <div className="flex-1">
          {children}
        </div>

        {/* Franja legal mínima — visible solo en desktop */}
        <footer className="hidden lg:flex items-center justify-center gap-6 py-6 border-t border-slate-100 bg-white/50 backdrop-blur-sm">
          <Link href="/terminos" className="text-[10px] font-black text-slate-300 hover:text-blue-600 uppercase tracking-widest transition-colors">
            Términos
          </Link>
          <span className="text-slate-200 text-[10px]">•</span>
          <Link href="/privacidad" className="text-[10px] font-black text-slate-300 hover:text-blue-600 uppercase tracking-widest transition-colors">
            Privacidad
          </Link>
          <span className="text-slate-200 text-[10px]">•</span>
          <Link href="/reclamaciones" className="text-[10px] font-black text-slate-300 hover:text-blue-600 uppercase tracking-widest transition-colors">
            Libro de Reclamaciones
          </Link>
          <span className="text-slate-200 text-[10px]">•</span>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            RUC: 20613771591
          </p>
        </footer>
      </main>
    </div>
  );
}