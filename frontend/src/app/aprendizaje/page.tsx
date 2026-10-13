// src/app/aprendizaje/page.tsx

import type { Metadata } from 'next';
import LearningCenterClient from './LearningCenterClient';

const SITE_URL = 'https://docentesmart.com';
const LOGO_URL =
  'https://res.cloudinary.com/ubjx67e4/image/upload/v1789429302/logo-docente-smart-simulacro-examenes-docente-peru-minedu.png';

export const metadata: Metadata = {
  // El layout raíz ya agrega "| DocenteSmart" vía template,
  // así que aquí NO se repite el nombre de marca en el title.
  title: 'Cuadernillos MINEDU y Claves de Respuestas',

  description:
    'Consulta y descarga cuadernillos y claves de respuestas de exámenes docentes del MINEDU. Material organizado por año, nivel y evaluación para Nombramiento y Ascenso Docente 2026.',

  keywords: [
    'cuadernillos minedu',
    'claves de respuestas minedu',
    'cuadernillo nombramiento docente',
    'cuadernillo ascenso docente',
    'examenes resueltos minedu',
  ],

  alternates: {
    canonical: `${SITE_URL}/aprendizaje`,
  },

  openGraph: {
    title: 'Cuadernillos MINEDU y Claves de Respuestas | DocenteSmart',
    description:
      'Cuadernillos y claves de respuestas de exámenes docentes del MINEDU, organizados por año, nivel y tipo de evaluación.',
    url: `${SITE_URL}/aprendizaje`,
    siteName: 'DocenteSmart',
    locale: 'es_PE',
    type: 'website',
    images: [
      {
        url: LOGO_URL,
        width: 1200,
        height: 630,
        alt: 'DocenteSmart — Cuadernillos y claves de respuestas MINEDU',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Cuadernillos MINEDU y Claves de Respuestas | DocenteSmart',
    description:
      'Consulta cuadernillos y claves de respuestas de exámenes docentes del MINEDU.',
    images: [LOGO_URL],
  },
};

export default function AprendizajePage() {
  return <LearningCenterClient />;
}