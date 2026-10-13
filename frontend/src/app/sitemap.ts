// src/app/sitemap.ts
import { MetadataRoute } from 'next';
import { fetchAPI } from '@/services/api';
import { Noticia } from '@/types';

const SITE_URL = 'https://docentesmart.com';

function staticRoutes(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/aprendizaje`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/examenes`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 }, // catálogo público, contenido único por cuadernillo
    { url: `${SITE_URL}/noticias`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/registro`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const noticias = await fetchAPI<Noticia[]>('/noticias?limit=200').catch((err) => {
    console.error('Error generando sitemap - noticias:', err);
    return [] as Noticia[];
  });

  const newsEntries: MetadataRoute.Sitemap = noticias.map((n) => ({
    url: `${SITE_URL}/noticias/${n.slug}`,
    lastModified: new Date(n.publicado_en),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes(), ...newsEntries];
}