// src/app/robots.ts
import { MetadataRoute } from 'next';

const SITE_URL = 'https://docentesmart.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/*',
          '/api/*',
          '/resultados',
          '/resultados/*',
          '/mis-guardados',
          '/simulacro/*',
          '/login',
          '/registro',
          '/onboarding',
          '/*?*utm_*',
          '/*?*ref=*',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/noticias/*', '/aprendizaje', '/examenes'],
      },
      {
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot'],
        disallow: '/',
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-noticias.xml`],
    host: SITE_URL,
  };
}