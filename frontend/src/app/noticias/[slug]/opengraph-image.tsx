// app/noticias/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { fetchAPI } from '@/services/api';
import { Noticia, getNoticiaImagen } from '@/types';

export const runtime = 'edge';
export const alt = 'DocenteSmart — Noticia MINEDU';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const noticia = await fetchAPI<Noticia>(`/noticias/${params.slug}`).catch(() => null);

  const titulo = noticia?.titulo ?? 'DocenteSmart — Preparación Docente MINEDU';
  const categoria = noticia?.categoria ?? 'MINEDU';
  const fondo = noticia ? getNoticiaImagen(noticia.banner_filename, 'banner') : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: '#0f172a',
        }}
      >
        {/* Banner real de la noticia como fondo, oscurecido para legibilidad */}
        {fondo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fondo}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', inset: 0, objectFit: 'cover', opacity: 0.35 }}
          />
        )}

        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            padding: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: '#22d3ee',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 900,
                color: '#0f172a',
              }}
            >
              DS
            </div>
            <span style={{ color: '#22d3ee', fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>
              DOCENTESMART · {categoria.toUpperCase()}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 54,
              fontWeight: 900,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: -1,
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {titulo.length > 90 ? `${titulo.slice(0, 90)}...` : titulo}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}