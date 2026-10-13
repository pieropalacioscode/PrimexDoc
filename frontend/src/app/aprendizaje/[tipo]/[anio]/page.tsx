import { Metadata } from "next";
import { buscarExamenPorAnio, TIPOS_INFO, TipoExamen } from "../../data";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Sparkles, Zap, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";

// 1. Definimos que params es una Promesa en la interfaz
interface Props {
  params: Promise<{ tipo: string; anio: string }>;
}

function validarTipo(tipo: string): tipo is TipoExamen {
  return tipo === "ascenso" || tipo === "nombramiento";
}

// 🎯 SEO DINÁMICO (Corregido con await params)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tipo, anio } = await params; // <--- AQUÍ: Desactivamos la promesa

  if (!validarTipo(tipo)) return { title: "Recurso no encontrado" };

  const examen = buscarExamenPorAnio(tipo, anio);
  const info = TIPOS_INFO[tipo];

  if (!examen) return { title: "Examen no encontrado" };

  const titulo = `Examen de ${info.label} ${examen.anio} | Cuadernillos y Claves PDF`;
  const desc = `Descarga gratis el examen oficial de ${info.label} del año ${examen.anio}. Incluye cuadernillos de preguntas, claves de respuestas y acceso al simulacro virtual interactivo.`;

  return {
    title: titulo,
    description: desc,
    openGraph: {
      title: titulo,
      description: desc,
      images: ["https://res.cloudinary.com/ubjx67e4/image/upload/v1789429302/logo-docente-smart-simulacro-examenes-docente-peru-minedu.png"],
    },
  };
}

// 2. Convertimos el componente en asíncrono para usar await
export default async function PaginaExamenAnio({ params }: Props) {
  const { tipo: tipoRaw, anio } = await params; // <--- AQUÍ: Desactivamos la promesa

  if (!validarTipo(tipoRaw)) {
    return notFound();
  }

  const tipo = tipoRaw;
  const examen = buscarExamenPorAnio(tipo, anio);
  const info = TIPOS_INFO[tipo];

  if (!examen) return notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">
          <Link href="/aprendizaje" className="hover:text-blue-600 transition-colors">Aprendizaje</Link>
          <ChevronRight size={10} />
          <span className="text-slate-600">{info.label}</span>
          <ChevronRight size={10} />
          <span className="text-blue-600">{examen.anio}</span>
        </nav>

        <header className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/10 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter mb-4 border border-blue-600/20">
            <Sparkles size={12} className="animate-pulse" /> Recursos Oficiales MINEDU
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6 tracking-tight">
            Evaluación de {info.label} <span className="text-blue-600 italic">{examen.anio}</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
            Accede a los instrumentos de evaluación aplicados en el concurso de {info.label} {examen.anio}.
            Material disponible para consulta y descarga gratuita de forma profesional.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* SECCIÓN DE DESCARGAS */}
          <section className="bg-white rounded-[2.5rem] border border-slate-200 p-6 sm:p-10 shadow-[0_20px_50px_rgba(8,_112,_184,_0.05)]">
            <h2 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileText size={20} />
              </div>
              Archivos del Examen
            </h2>

            <div className="space-y-4">
              {[
                { label: "Primaria - Forma 1", data: examen.primariaF1 },
                { label: "Primaria - Forma 2", data: examen.primariaF2 }
              ].map((fase, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-slate-100 gap-4 transition-all hover:bg-white hover:border-blue-200 group">
                  <span className="font-bold text-slate-700">{fase.label}</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <a
                      href={fase.data.cuadernillo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-3 px-5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      PDF Preguntas
                    </a>

                    {fase.data.simulacroID ? (
                        <Link
                          href={`/simulacro/${fase.data.simulacroID}`}
                          className="flex-[2] text-center py-3 px-6 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-200 flex items-center justify-center gap-2 hover:bg-slate-900 transition-all"
                        >
                            <Zap size={14} fill="currentColor" /> Simulacro Virtual
                        </Link>
                    ) : (
                        <a
                          href={fase.data.claves}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-3 px-5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 transition-all"
                        >
                          Claves
                        </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* CTA MARKETING */}
          <section className="bg-slate-900 rounded-[3rem] p-8 sm:p-14 text-white relative overflow-hidden shadow-2xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-center md:text-left max-w-md">
                    <h2 className="text-3xl font-black mb-4 leading-tight">¿Quieres medir tu <span className="text-blue-400">puntaje real</span>?</h2>
                    <p className="text-slate-400 font-medium">No te limites a leer. Usa nuestro simulador con el temario oficial de {examen.anio} y obtén tu ranking nacional al instante.</p>
                </div>
                <Link
                  href="/register"
                  className="w-full md:w-auto text-center bg-white text-blue-600 px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-xl"
                >
                    Registrarme Gratis
                </Link>
            </div>
            <Zap className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 rotate-12 pointer-events-none" />
          </section>
        </div>
      </main>

      <footer className="py-12 text-center">
         <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">© 2025 Docente Smart • Material Educativo Profesional</p>
      </footer>
    </div>
  );
}