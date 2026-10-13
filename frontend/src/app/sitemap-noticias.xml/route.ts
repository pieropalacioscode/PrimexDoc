// src/app/sitemap-noticias.xml/route.ts
import { fetchAPI } from '@/services/api';
import { Noticia } from '@/types';

const SITE_URL = 'https://docentesmart.com';

// Evita que Next genere este archivo una sola vez en el build: la ventana
// de 48h debe calcularse en cada petición.
export const dynamic = 'force-dynamic';

// Google News solo quiere artículos creados en los últimos 2 días.
const VENTANA_HORAS = 48;

// Si no hay nada dentro de la ventana, se listan las últimas N noticias como
// URLs normales (solo <loc>, SIN <news:news>). Así el archivo nunca queda
// vacío y se respeta la guía de Google: los artículos de más de 2 días no
// deben llevar metadata de News.
const MINIMO_URLS = 5;

export async function GET() {
  let noticias: Noticia[];
  try {
    noticias = await fetchAPI<Noticia[]>('/noticias?limit=1000');
  } catch (err) {
    console.error('Error generando sitemap-noticias:', err);
    // Un fallo de la API NO es lo mismo que "no hay noticias recientes":
    // respondemos 503 para que Google reintente en vez de leer un sitemap
    // vacío como si fuera intencional.
    return new Response('Servicio no disponible', {
      status: 503,
      headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' },
    });
  }

  const ahora = Date.now();
  const ventanaMs = VENTANA_HORAS * 60 * 60 * 1000;

  // Fechas válidas, de la más nueva a la más antigua.
  const conFecha = noticias
    .map((n) => ({ n, t: new Date(n.publicado_en).getTime() }))
    .filter(({ t }) => !Number.isNaN(t))
    .sort((a, b) => b.t - a.t);

  const recientes = conFecha.filter(({ t }) => ahora - t <= ventanaMs);

  const entradaNews = ({ n, t }: { n: Noticia; t: number }) => `
  <url>
    <loc>${SITE_URL}/noticias/${escapeXml(n.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>DocenteSmart</news:name>
        <news:language>es</news:language>
      </news:publication>
      <news:publication_date>${new Date(t).toISOString()}</news:publication_date>
      <news:title>${escapeXml(n.titulo)}</news:title>
    </news:news>
  </url>`;

  const entradaSimple = ({ n }: { n: Noticia }) => `
  <url>
    <loc>${SITE_URL}/noticias/${escapeXml(n.slug)}</loc>
  </url>`;

  const urlEntries =
    recientes.length > 0
      ? recientes.map(entradaNews).join('')
      : conFecha.slice(0, MINIMO_URLS).map(entradaSimple).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urlEntries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      // Cache corto: el contenido cambia según la ventana de 48h.
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=1800',
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}