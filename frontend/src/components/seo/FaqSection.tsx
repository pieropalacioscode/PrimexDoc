// src/components/seo/FaqSection.tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

type FaqItem = {
  pregunta: string;
  respuesta: string;
};

const FAQS: FaqItem[] = [
  {
    pregunta: '¿Qué diferencia hay entre Nombramiento y Ascenso Docente?',
    respuesta:
      'El Nombramiento es para docentes contratados o interinos que buscan ingresar de forma estable a la Carrera Pública Magisterial (CPM). El Ascenso de Escala es para docentes que ya están nombrados y quieren subir de escala magisterial, lo que significa mejor sueldo en el mismo puesto.',
  },
  {
    pregunta: '¿Cómo se reparte el puntaje en el examen de Ascenso?',
    respuesta:
      'La prueba de Ascenso tiene 60 preguntas, cada una vale 1.5 puntos, con un puntaje máximo posible de 90 puntos. Puedes revisar la fuente oficial en el portal de Evaluación Docente de PerúEduca.',
  },
  {
    pregunta: '¿Cómo se reparte el puntaje en el examen de Nombramiento?',
    respuesta:
      'La Prueba Única Nacional de Nombramiento se divide en dos subpruebas: Habilidades Generales (50 puntos) y Conocimientos Pedagógicos, Curriculares y Disciplinares (150 puntos), sobre un total de 200 puntos. El mínimo para aprobar la segunda subprueba es 84 puntos, y el puntaje mínimo total para aprobar es 110 de 200 puntos.',
  },
  {
    pregunta: '¿Puedo probar la plataforma antes de pagar?',
    respuesta:
      'Sí. El examen de Nombramiento 2018 de Primaria (Forma 1 y Forma 2) tiene acceso 100% gratuito a nuestro simulador cronometrado, sin necesidad de suscripción. Puedes probarlo directamente desde la sección de Aprendizaje.',
  },
  {
    pregunta: '¿Cuándo es el próximo examen de Nombramiento o Ascenso?',
    respuesta:
      'El MINEDU publica y puede reprogramar las fechas oficiales mediante Resolución Viceministerial. Para la fecha más actualizada de cada proceso, revisa nuestra sección de Noticias, donde actualizamos el cronograma apenas el MINEDU lo confirma o modifica.',
  },
];

function FaqJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.respuesta,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-white">
      <FaqJsonLd />
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 text-center mb-16">
          Preguntas Frecuentes
        </h2>

        <div className="space-y-4">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.pregunta}
                className="border-2 border-slate-100 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left"
                >
                  <span className="font-black text-slate-900">{faq.pregunta}</span>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-cyan-600 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 text-slate-500 font-medium leading-relaxed">
                    <p>{faq.respuesta}</p>
                    {i === 4 && (
                      <Link
                        href="/noticias"
                        className="inline-flex items-center gap-1 mt-3 text-cyan-600 font-bold text-sm hover:underline"
                      >
                        Ver últimas noticias →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}