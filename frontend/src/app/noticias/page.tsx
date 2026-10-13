// src/app/noticias/page.tsx
import { fetchAPI } from '@/services/api';
import { Noticia, getNoticiaImagen } from '@/types';
import Link from 'next/link';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { Calendar, ArrowRight, Newspaper } from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

const SITE_URL = 'https://docentesmart.com';

export const metadata = {
  title: 'Noticias y Actualidad Docente | DocenteSmart',
  description: 'Información actualizada sobre Nombramiento Docente, Ascenso de Escala y comunicados oficiales del MINEDU.',
  alternates: { canonical: `${SITE_URL}/noticias` },
};

export const revalidate = 60;

export default async function NoticiasListPage() {
  const noticias = await fetchAPI<Noticia[]>('/noticias?limit=20').catch(() => []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <BreadcrumbJsonLd
        items={[
          { name: 'Inicio', url: SITE_URL },
          { name: 'Noticias', url: `${SITE_URL}/noticias` },
        ]}
      />

      <Navbar />
      <main className="flex-grow py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-6">

          <header className="mb-16 text-center">
            <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-700 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-[0.2em] mb-6 border border-cyan-100">
              <Newspaper size={14} />
              <span>Centro de Noticias</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter uppercase italic">
              Actualidad <span className="text-cyan-600">Docente</span>
            </h1>
            <p className="mt-4 text-slate-500 font-medium max-w-2xl mx-auto text-lg">
              Mantente informado con las últimas novedades del sector educación en el Perú.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {noticias.map((n) => (
              <Link key={n.id} href={`/noticias/${n.slug}`} className="group flex flex-col bg-white rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100 hover:-translate-y-2 transition-all duration-500">
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={getNoticiaImagen(n.banner_filename)}
                    alt={n.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-cyan-600 shadow-sm">
                    {n.categoria}
                  </div>
                </div>

                <div className="p-10 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                    <Calendar size={14} />
                    {new Date(n.publicado_en).toLocaleDateString('es-PE')}
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4 group-hover:text-cyan-600 transition-colors uppercase italic">
                    {n.titulo}
                  </h2>

                  <p className="text-slate-500 text-sm font-medium line-clamp-3 mb-8 leading-relaxed">
                    {n.resumen}
                  </p>

                  <div className="mt-auto flex items-center gap-2 text-blue-600 font-black text-[11px] uppercase tracking-widest group-hover:gap-4 transition-all">
                    Leer más <ArrowRight size={16} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {noticias.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest">No hay noticias publicadas todavía.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}