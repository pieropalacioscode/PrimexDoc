'use client';

import React from 'react';
import Link from 'next/link';
import {
BookOpen,
Cpu,
Clock,
Layout,
Mountain,
ShieldCheck,
CheckCircle2,
MessageCircle,
ArrowLeft,
Sparkles,
Zap,
ChevronRight
} from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import { WhatsappButton } from '@/components/marketing/WhatsappButton';

/**

* USERNAME PÚBLICO DE WHATSAPP
*
* Reemplaza SOLO este valor por tu nombre de usuario oficial.
*
* Ejemplo:
* const WHATSAPP_USERNAME = 'DocenteSmart';
*
* NO coloques tu número telefónico aquí.
  */
  const WHATSAPP_USERNAME = 'pieropalacios.neo';

/**

* Genera el enlace de contacto usando el username público.
*
* Si WhatsApp te proporciona otro formato oficial de URL para
* usernames, solo tendrás que modificar esta función.
  */
  const createWhatsAppUrl = (message: string) => {
  return `https://wa.me/${WHATSAPP_USERNAME}?text=${encodeURIComponent(message)}`;
  };

interface ServiceCard {
id: string;
badge: string;
badgeStyle: string;
icon: React.ElementType;
iconBg: string;
title: string;
description: string;
features: string[];
waMessage: string;
isPopular?: boolean;
}

export default function ServiciosPage() {
const servicios: ServiceCard[] = [
{
id: 'sesiones',
badge: 'Nuevo Servicio 🔥',
badgeStyle: 'bg-blue-50 text-blue-700 border-blue-100',
icon: BookOpen,
iconBg: 'bg-blue-50 text-blue-600',
title: 'Unidades y Sesiones de Aprendizaje a Medida',
description:
'Diseñamos tus unidades didácticas y sesiones de aprendizaje personalizadas según el contexto de tu I.E., necesidades de tus estudiantes y competencias del CNEB 2026.',
features: [
'Contextualización local y diversificación',
'Propósitos y criterios de evaluación claros',
'Secuencia didáctica completa con instrumentos'
],
waMessage:
'Hola, deseo cotizar la elaboración de Unidades y Sesiones de Aprendizaje a medida.'
},
{
id: 'asesoria-ia',
badge: 'Innovación Tecnológica 🤖',
badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-100',
icon: Cpu,
iconBg: 'bg-blue-600 text-white',
title: 'Asesoría en IA (Especial para Adultos y Docentes)',
description:
'Te enseñamos paso a paso, desde cero y con máxima paciencia, a usar Claude y ChatGPT. Aprende a conectar MCPs, integrar Tokens de Claude, administrar correos y proteger tu seguridad digital.',
features: [
'Acompañamiento 1 a 1 en vivo (vía Meet/Zoom)',
'Configuración de conectores MCP y API Tokens',
'Metodología amigable y paciente sin tecnicismos'
],
waMessage:
'Hola, solicito información sobre las sesiones de Asesoría en IA y tecnología.',
isPopular: true
},
{
id: 'informes',
badge: 'Entrega Express ⚡',
badgeStyle: 'bg-amber-50 text-amber-700 border-amber-100',
icon: Clock,
iconBg: 'bg-amber-50 text-amber-600',
title: 'Informes Bimestrales / Trimestrales',
description:
'Envíanos tus registros de notas en cualquier formato y redactamos el informe cualitativo pedagógico completo, con logros, dificultades y sugerencias precisas por estudiante.',
features: [
'Garantía de entrega en menos de 24 horas',
'Redacción técnica pedagógica según CNEB',
'Formato listo para traslado a SIAGIE'
],
waMessage:
'Hola, necesito el servicio express de elaboración de Informes Bimestrales.'
},
{
id: 'registro-inteligente',
badge: 'Plantilla Automatizada ⚙️',
badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-100',
icon: Layout,
iconBg: 'bg-emerald-50 text-emerald-600',
title: 'Registro Inteligente de Calificaciones',
description:
'La plantilla definitiva en Excel. Ingresa la nota del estudiante una sola vez y el sistema procesa el Dashboard visual de promedios, mapas de calor y la conclusión descriptiva automática.',
features: [
'Sin macros complejas ni fallas de compatibilidad',
'Generador automático de conclusiones descriptivas',
'Dashboard gráfico de rendimiento por competencia'
],
waMessage:
'Hola, deseo adquirir la plantilla del Registro Inteligente de Calificaciones.'
},
{
id: 'multigrado-eib',
badge: 'Especializado Rural 🏔️',
badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
icon: Mountain,
iconBg: 'bg-slate-100 text-slate-700',
title: 'Registro Auxiliar Multigrado / EIB',
description:
'Plantilla adaptada para docentes de aulas unidocentes y multigrado. Integra las más de 80 competencias del CNEB con bloques específicos para Castellano L2 y Lengua Originaria.',
features: [
'Estructurado por ciclos y grados simultáneos',
'Adaptado a la normativa EIB vigente',
'Impresión rápida y llenado intuitivo'
],
waMessage:
'Hola, solicito información sobre la plantilla de Registro Auxiliar Multigrado / EIB.'
},
{
id: 'seguridad-digital',
badge: 'Soporte Técnico 🛡️',
badgeStyle: 'bg-rose-50 text-rose-700 border-rose-100',
icon: ShieldCheck,
iconBg: 'bg-slate-900 text-white',
title: 'Seguridad Digital y Cuentas',
description:
'Servicio de asistencia técnica especializada: recuperación de contraseñas, aseguramiento de cuentas de correo, protección contra estafas y configuración de dispositivos.',
features: [
'Recuperación de cuentas institucionales/personales',
'Verificación en dos pasos y respaldo de archivos',
'Atención personalizada con garantía'
],
waMessage:
'Hola, necesito ayuda con soporte técnico y seguridad de mis cuentas digitales.'
}
];

return ( <div className="min-h-screen bg-slate-50 flex flex-col font-sans"> <Navbar />

```
  <main className="flex-grow pt-12 pb-24">
    {/* HERO */}
    <section className="relative bg-white border-b border-slate-200/80 py-12 sm:py-16 lg:py-20 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600 transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft size={16} />
          Volver al Inicio
        </Link>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-5 sm:mb-6">
            <Sparkles
              size={14}
              className="text-blue-600 animate-pulse"
            />
            Soluciones Integrales DocenteSmart
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight mb-5 sm:mb-6">
            Catálogo de{' '}
            <span className="text-blue-600 italic">
              Servicios & Asesoría
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 font-medium leading-relaxed">
            Elige la solución que necesitas para automatizar tu carga
            administrativa, dominar la tecnología o preparar tu material
            pedagógico. Haz clic en cualquier servicio para iniciar una
            conversación.
          </p>
        </div>
      </div>
    </section>

    {/* SERVICIOS */}
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
        {servicios.map((item) => {
          const IconComponent = item.icon;
          const waUrl = createWhatsAppUrl(item.waMessage);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border transition-all duration-300 flex flex-col justify-between relative group ${
                item.isPopular
                  ? 'border-2 border-blue-600 shadow-xl shadow-blue-100/50 hover:shadow-2xl'
                  : 'border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-300'
              }`}
            >
              {item.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black uppercase px-4 py-1 rounded-full tracking-widest shadow-md whitespace-nowrap">
                  MÁS SOLICITADO
                </div>
              )}

              <div>
                <div className="flex items-start sm:items-center justify-between gap-3 mb-5 sm:mb-6">
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${item.iconBg}`}
                  >
                    <IconComponent size={26} />
                  </div>

                  <span
                    className={`text-[9px] sm:text-[10px] text-center font-black uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full border ${item.badgeStyle}`}
                  >
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>

                <p className="text-sm text-slate-500 leading-relaxed font-medium mb-6">
                  {item.description}
                </p>

                <div className="space-y-2.5 mb-7 sm:mb-8 border-t border-slate-100 pt-5 sm:pt-6">
                  {item.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5"
                    >
                      <CheckCircle2
                        size={16}
                        className="text-emerald-500 mt-0.5 shrink-0"
                      />

                      <span className="text-xs font-bold text-slate-700 leading-tight">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Consultar sobre ${item.title}`}
                className={`w-full min-h-[52px] py-4 px-5 sm:px-6 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 group/btn active:scale-[0.98] ${
                  item.isPopular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                    : 'bg-slate-900 hover:bg-blue-600 text-white'
                }`}
              >
                <MessageCircle
                  size={18}
                  className="fill-white/20 shrink-0"
                />

                <span className="text-center">
                  Consultar por WhatsApp
                </span>

                <ChevronRight
                  size={16}
                  className="shrink-0 group-hover/btn:translate-x-1 transition-transform"
                />
              </a>
            </div>
          );
        })}
      </div>

      {/* CONSULTA GENERAL */}
      <div className="mt-10 sm:mt-16 bg-slate-900 text-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -inset-y-0 w-full lg:w-1/2 bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />

        <div className="max-w-2xl text-center lg:text-left relative z-10">
          <div className="inline-flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-widest mb-3">
            <Zap size={16} />
            Atención Inmediata
          </div>

          <h2 className="text-2xl sm:text-4xl font-black mb-4 leading-tight">
            ¿Buscas una solución personalizada o un paquete especial?
          </h2>

          <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
            Escríbenos directamente indicando tu requerimiento pedagógico o
            tecnológico y te responderemos lo antes posible.
          </p>
        </div>

        <a
          href={createWhatsAppUrl(
            'Hola DocenteSmart, necesito asesoría personalizada sobre un servicio no listado.'
          )}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar a DocenteSmart para una asesoría general"
          className="relative z-10 w-full sm:w-auto min-h-[56px] bg-emerald-500 hover:bg-emerald-600 text-white font-black px-6 sm:px-8 py-4 sm:py-5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-3 whitespace-nowrap active:scale-[0.98]"
        >
          <MessageCircle size={22} />
          <span>Contactar Asesor General</span>
        </a>
      </div>
    </section>
  </main>

  <Footer />

  <WhatsappButton />
</div>

);
}
