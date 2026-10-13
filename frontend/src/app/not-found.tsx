import { Metadata } from 'next';
import { FileQuestion } from 'lucide-react';
import { NotFoundActions } from './NotFoundActions';

// Server Component: aquí SÍ funciona `metadata`. En el snippet original
// el archivo tenía 'use client', y Next.js ignora (o rompe) el export de
// metadata en Client Components — por eso lo movemos a este componente
// de servidor y dejamos solo lo interactivo (botones) en un hijo cliente.
export const metadata: Metadata = {
  title: '404 - Página No Encontrada | DocenteSmart',
  description: 'La página que buscas no existe en nuestra plataforma oficial.',
  robots: { index: false, follow: true }, // Evita que Google indexe esta página
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Branding Superior (decorativo, no es el h1 de la página) */}
      <div className="mb-12 text-center animate-in fade-in duration-700">
        <p className="text-3xl font-black text-slate-900 tracking-tight italic">
          Primex<span className="text-blue-600">Doc</span>
        </p>
      </div>

      <main
        className="max-w-xl w-full bg-white rounded-[40px] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10 text-center relative overflow-hidden"
        role="alert"
        aria-live="polite"
      >
        {/* Decoración de seguridad (Abstracta) */}
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50" />

        {/* Icono Principal */}
        <div aria-hidden="true" className="relative w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-8">
          <FileQuestion size={48} strokeWidth={1.5} />
          {/* motion-safe: respeta prefers-reduced-motion automáticamente */}
          <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-full motion-safe:animate-[spin_10s_linear_infinite]" />
        </div>

        {/* Mensaje de Error (h1 real de la página) */}
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-4">
          Página <span className="text-blue-600">No Encontrada</span>
        </h1>
        <p className="text-slate-500 font-medium leading-relaxed mb-10">
          Lo sentimos, docente. El recurso que buscas no existe o ha sido movido.
          No te preocupes, puedes volver al camino seguro usando los botones de abajo.
        </p>

        {/* Acciones interactivas (requieren cliente: router, pathname) */}
        <NotFoundActions />
      </main>

      {/* Footer de Seguridad */}
      <p className="mt-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
        Safe Navigation Guaranteed • DocenteSmart v7.0
      </p>
    </div>
  );
}