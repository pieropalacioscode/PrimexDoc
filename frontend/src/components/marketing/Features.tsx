"use client";
import Link from 'next/link';
import {
  BarChart3,
  Zap,
  BookOpen,
  Download,
  Smartphone,
  Target,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';

const features = [
  {
    title: "Diagnóstico de Radar Pro",
    desc: "Nuestra tecnología analiza tu desempeño por áreas (Pedagogía, Razonamiento, Lectura) y te muestra un gráfico de radar con tus fortalezas.",
    icon: BarChart3,
    color: "bg-blue-600",
    badge: "Exclusivo",
    href: "/examenes"
  },
  {
    title: "Modo Entrenamiento",
    desc: "Aprende mientras practicas. Recibe la respuesta correcta y la explicación pedagógica inmediatamente después de marcar.",
    icon: Lightbulb,
    color: "bg-amber-500",
    href: "/examenes"
  },
  {
    title: "Sustento Pedagógico",
    desc: "Todas nuestras preguntas incluyen el sustento oficial del MINEDU. Entiende el 'porqué' de cada respuesta.",
    icon: BookOpen,
    color: "bg-emerald-600",
    href: "/examenes"
  },
  {
    title: "Descarga de PDFs",
    desc: "Lleva tus exámenes a donde quieras. Descarga los cuadernillos oficiales y las claves en formato PDF para estudiar sin internet.",
    icon: Download,
    color: "bg-slate-800",
    href: "/aprendizaje"
  },
  {
    title: "Simulador Realista",
    desc: "Interface idéntica a la Prueba Nacional, con cronómetro oficial y sistema de marcado de preguntas para revisión.",
    icon: Target,
    color: "bg-cyan-600",
    href: "/examenes"
  },
  {
    title: "Multidispositivo",
    desc: "Estudia en tu laptop, tablet o celular. Tu progreso se sincroniza automáticamente en todos tus dispositivos.",
    icon: Smartphone,
    color: "bg-indigo-600",
    href: "/examenes"
  }
];

export const Features = () => {
  return (
    <section id="caracteristicas" className="py-24 bg-white relative overflow-hidden">
      {/* Decoración de fondo */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Cabecera de Sección */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-blue-600 font-black text-sm uppercase tracking-[0.2em] mb-4">
            Metodología DocenteSmart
          </h2>
          <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
            Diseñado para que logres tu <span className="text-blue-600 italic">Nombramiento</span>
          </p>
          <p className="text-lg text-slate-500 font-medium leading-relaxed">
            Hemos analizado miles de preguntas de exámenes anteriores para ofrecerte la herramienta de preparación más completa del magisterio.
          </p>
        </div>

        {/* Grid de Características */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-100 transition-all duration-300 relative flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={28} />
                </div>
                {feature.badge && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                    {feature.badge}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight">
                {feature.title}
              </h3>

              <p className="text-slate-500 text-sm leading-relaxed font-medium mb-6 flex-grow">
                {feature.desc}
              </p>

              {/* BOTÓN INTELIGENTE — usa el href propio de cada feature */}
              <Link
                href={feature.href}
                className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest transition-all group-hover:translate-x-2 relative z-10"
              >
                <span>Saber más</span>
                <Zap size={14} fill="currentColor" className="animate-pulse" />
              </Link>

              {/* Área de clic expandida para que todo el card sea clickeable */}
              <Link
                href={feature.href}
                className="absolute inset-0 z-0 rounded-[2.5rem]"
                title={feature.title}
              />
            </div>
          ))}
        </div>

        {/* Sección de Confianza / Checkmarks */}
        <div className="mt-20 pt-10 border-t border-slate-100 flex flex-wrap justify-center gap-x-12 gap-y-6">
          <div className="flex items-center gap-2 text-slate-600 font-bold italic">
            <CheckCircle2 className="text-emerald-500" size={20} />
            Basado en Temarios Oficiales
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-bold italic">
            <CheckCircle2 className="text-emerald-500" size={20} />
            Actualizado a la Norma 2026
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-bold italic">
            <CheckCircle2 className="text-emerald-500" size={20} />
            Desarrollado por Especialistas
          </div>
        </div>
      </div>
    </section>
  );
};