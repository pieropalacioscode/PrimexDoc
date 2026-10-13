import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

const SITE_URL = 'https://docentesmart.com';
const LOGO_URL =
  'https://res.cloudinary.com/ubjx67e4/image/upload/v1789429302/logo-docente-smart-simulacro-examenes-docente-peru-minedu.png';

export const metadata: Metadata = {
  // metadataBase resuelve automáticamente las URLs relativas de OG/Twitter
  // en todas las sub-páginas, y evita el warning de Next en build.
  metadataBase: new URL(SITE_URL),

  title: {
    default: 'DocenteSmart | Nombramiento y Ascenso Docente 2026',
    template: '%s | DocenteSmart',
  },

  description:
    'La plataforma líder en preparación para la Carrera Pública Magisterial en Perú. Simulacros oficiales MINEDU, analítica de resultados y noticias actualizadas para Nombramiento y Ascenso Docente.',

  keywords: [
    'docente smart',
    'nombramiento docente 2026',
    'ascenso de escala magisterial',
    'simulacro minedu',
    'carrera pública magisterial',
    'examen docente peru',
  ],

  authors: [{ name: 'DocenteSmart' }],
  creator: 'DocenteSmart',
  publisher: 'GRUPO EMPRESARIAL KELPAD S.R.L.',

  // Controla explícitamente cómo indexa Google — por defecto ya es así,
  // pero declararlo evita sorpresas si luego agregas páginas privadas.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  icons: {
    icon: [{ url: LOGO_URL, sizes: '512x512', type: 'image/png' }],
    apple: [{ url: LOGO_URL, sizes: '180x180', type: 'image/png' }],
    shortcut: LOGO_URL,
  },

  openGraph: {
    type: 'website',
    locale: 'es_PE',
    siteName: 'DocenteSmart',
    url: SITE_URL,
    title: 'DocenteSmart | Nombramiento y Ascenso Docente 2026',
    description:
      'Simulacros oficiales MINEDU, analítica de resultados y sustento pedagógico verificado para tu preparación docente.',
    images: [
      {
        url: LOGO_URL,
        width: 1200,
        height: 630,
        alt: 'DocenteSmart — Plataforma de preparación docente MINEDU',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'DocenteSmart | Nombramiento y Ascenso Docente 2026',
    description:
      'Simulacros oficiales MINEDU y analítica de resultados para tu preparación docente.',
    images: [LOGO_URL],
  },

  alternates: {
    canonical: SITE_URL,
  },

  // Reemplaza con tu código real de Google Search Console cuando lo tengas
  // (Configuración → Verificación de propiedad → etiqueta HTML)
  // verification: {
  //   google: 'TU_CODIGO_DE_VERIFICACION',
  // },
};

// themeColor y viewport ahora se declaran aparte de `metadata` (requerido desde Next 14)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a', // slate-900, coherente con tu paleta de marca
};

function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'EducationalOrganization',
        name: 'DocenteSmart',
        alternateName: 'Docente Smart',
        url: SITE_URL,
        logo: LOGO_URL,
        description:
          'Plataforma de preparación para el Nombramiento Docente y Ascenso de Escala Magisterial en el Perú.',
        areaServed: 'PE',
      },
      {
        '@type': 'WebSite',
        url: SITE_URL,
        name: 'DocenteSmart',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/examenes?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <OrganizationJsonLd />
        <AuthProvider>
          {children}
          {/* Configuración de Alertas Premium */}
          <Toaster
            position="top-center" // 💡 Ideal para no tapar menús inferiores en móvil
            expand={false}
            richColors
            closeButton
            theme="light"
            toastOptions={{
              style: {
                borderRadius: '20px',
                padding: '12px 20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontFamily: inter.style.fontFamily,
                marginTop: '10px', // Espacio para que no choque con el borde superior
              },
              className: 'font-bold uppercase text-[10px] tracking-widest',
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}