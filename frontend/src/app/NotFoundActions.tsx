'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Search, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/services/api';

export function NotFoundActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Solo mostramos "Volver Atrás" si de verdad hay historial previo en
    // esta pestaña. Si el usuario llegó por link directo, marcador o
    // recargó la página, window.history.length es 1 y el botón no haría
    // nada útil (o lo sacaría del sitio) — mejor no mostrarlo.
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    // Registro best-effort de la ruta rota, para poder detectar links
    // caídos o URLs mal escritas sin exponer nada sensible al usuario.
    // Si tu backend no tiene este endpoint todavía, esto falla en
    // silencio y no afecta la página; ajusta la ruta o elimina el bloque.
    fetchAPI('/analytics/404', {
      method: 'POST',
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
    }).catch(() => {
      // Intencionalmente silencioso: nunca debe romper la página 404.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const soporteHref = `/reclamaciones?tipo=ERROR_CONTENIDO&asunto=${encodeURIComponent(
    `Página no encontrada`
  )}&ruta=${encodeURIComponent(pathname)}`;

  return (
    <>
      <div className={`grid grid-cols-1 gap-4 ${canGoBack ? 'sm:grid-cols-2' : 'max-w-xs mx-auto'}`}>
        {canGoBack && (
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-3 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 text-[10px] uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <ArrowLeft size={16} /> Volver Atrás
          </button>
        )}

        <Link
          href="/examenes"
          className="flex items-center justify-center gap-3 bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 text-[10px] uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Search size={16} /> Ir al Catálogo
        </Link>
      </div>

      {/* Enlace de Soporte: lleva al formulario interno de Reclamaciones
          (no un mailto:) precargado con el tipo y la ruta rota, así el
          usuario nunca sale de la app ni se enfrenta al selector de
          apps de correo del sistema operativo. */}
      <div className="mt-12 pt-8 border-t border-slate-50">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">
          ¿Crees que esto es un error del sistema?
        </p>
        <Link
          href={soporteHref}
          className="inline-flex items-center gap-2 text-blue-600 font-black text-[11px] uppercase tracking-tighter hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          <MessageSquare size={14} /> Reportar el Problema
        </Link>
      </div>
    </>
  );
}