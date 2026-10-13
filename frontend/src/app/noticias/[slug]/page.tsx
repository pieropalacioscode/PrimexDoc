// app/noticias/[slug]/page.tsx
import { Metadata } from 'next';
import { fetchAPI } from '@/services/api';
import { Noticia, getNoticiaImagen } from '@/types';
import { Calendar, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { notFound } from 'next/navigation';
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd';

const SITE_URL = 'https://docentesmart.com';
const LOGO_URL =
  'https://res.cloudinary.com/ubjx67e4/image/upload/v1789429302/logo-docente-smart-simulacro-examenes-docente-peru-minedu.png';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const noticia = await fetchAPI<Noticia>(`/noticias/${slug}`);
    // Nota: la imagen OG ahora la genera opengraph-image.tsx automáticamente
    // (ver archivo aparte). Ya NO se declara aquí para evitar que compitan.
    return {
      title: `${noticia.meta_title || noticia.titulo}`,
      description: noticia.meta_description || noticia.resumen,
      alternates: { canonical: `${SITE_URL}/noticias/${noticia.slug}` },
      openGraph: {
        title: noticia.titulo,
        description: noticia.resumen,
        type: 'article',
        publishedTime: noticia.publicado_en,
        url: `${SITE_URL}/noticias/${noticia.slug}`,
      },
    };
  } catch {
    return { title: 'Noticia | DocenteSmart' };
  }
}

function ArticleJsonLd({ noticia }: { noticia: Noticia }) {
  const imagenAbsoluta = getNoticiaImagen(noticia.banner_filename, 'banner');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article', // Empezamos con 'Article'; se puede subir a 'NewsArticle' si aplicas a Google News
    headline: noticia.titulo,
    description: noticia.meta_description || noticia.resumen,
    image: [imagenAbsoluta],
    datePublished: noticia.publicado_en,
    dateModified: noticia.publicado_en, // no existe actualizado_en en el tipo actual
    articleSection: noticia.categoria,
    author: [{ '@type': 'Organization', name: 'DocenteSmart', url: SITE_URL }],
    publisher: {
      '@type': 'Organization',
      name: 'DocenteSmart',
      logo: { '@type': 'ImageObject', url: LOGO_URL },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/noticias/${noticia.slug}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function NoticiaDetallePage({ params }: Props) {
  const { slug } = await params;

  let noticia: Noticia;
  try {
    noticia = await fetchAPI<Noticia>(`/noticias/${slug}`);
  } catch (error) {
    notFound();
  }

  const imgCard = getNoticiaImagen(noticia.banner_filename, 'card');
  const imgBanner = getNoticiaImagen(noticia.banner_filename, 'banner');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ArticleJsonLd noticia={noticia} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Inicio', url: SITE_URL },
          { name: 'Noticias', url: `${SITE_URL}/noticias` },
          { name: noticia.titulo, url: `${SITE_URL}/noticias/${noticia.slug}` },
        ]}
      />

      <Navbar />

      <main className="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-16 sm:pb-20">
        {/* --- CABECERA EDITORIAL --- */}
        <header className="mb-8 sm:mb-10">
          <Link
            href="/noticias"
            className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6 sm:mb-8 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={14} /> Noticias
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-5 sm:mb-6">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
              {noticia.categoria}
            </span>
            <span className="text-slate-300 text-xs">•</span>
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <Calendar size={12} />
              {new Date(noticia.publicado_en).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-[1.1] uppercase italic mb-5 sm:mb-6">
            {noticia.titulo}
          </h1>

          <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed italic border-l-4 border-cyan-500 pl-5 sm:pl-6 max-w-2xl">
            {noticia.resumen}
          </p>
        </header>

        <div
          className="relative w-full overflow-hidden rounded-2xl sm:rounded-[2rem]
                     shadow-lg sm:shadow-2xl border border-slate-100 bg-slate-50
                     mb-10 sm:mb-12
                     aspect-video md:aspect-[21/9]"
        >
          <picture>
            <source media="(min-width: 768px)" srcSet={imgBanner} />
            <img
              src={imgCard}
              alt={noticia.titulo}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>

        <article
          className="prose prose-slate sm:prose-lg lg:prose-xl max-w-none
          prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter
          prose-p:text-slate-600 prose-p:leading-relaxed
          prose-strong:text-slate-900 prose-strong:font-black
          prose-a:text-blue-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-2xl prose-img:shadow-md
          prose-ul:list-disc prose-ul:pl-6"
          dangerouslySetInnerHTML={{ __html: noticia.contenido_html }}
        />

        <div className="mt-16 sm:mt-20 p-6 sm:p-12 bg-slate-900 rounded-[2rem] sm:rounded-[3rem] text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl sm:text-3xl font-black text-white uppercase italic mb-3 sm:mb-4">
              Prepárate para ganar
            </h3>
            <p className="text-slate-400 text-sm mb-6 sm:mb-8">
              Únete a los miles de docentes que ya están practicando.
            </p>
            <Link
              href="/examenes"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-900/20"
            >
              Ir al simulador <Zap size={16} fill="currentColor" />
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />
        </div>
      </main>

      <Footer />
    </div>
  );
}