"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calculator,
  Download,
  GraduationCap,
  ClipboardList,
  Info,
  ChevronDown,
  Target,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  Zap,
} from "lucide-react";

// ============================================================
// TIPOS
// ============================================================

interface ExamLink {
  cuadernillo: string;
  claves: string;
}

interface ExamYear {
  anio: number;
  nota?: string;
  primariaF1: ExamLink;
  primariaF2: ExamLink;
  edFisica?: ExamLink;
  innovacionPedagogica?: ExamLink;
}

type EsquemaId = "vigente" | "historico2018";

// ============================================================
// DATA REAL: EXÁMENES ASCENSO PRIMARIA (VERIFICADOS)
// ============================================================

const EXAMENES_POR_ANIO: ExamYear[] = [
  {
    anio: 2025,
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967224A04-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967224A04-EBRP-11_C.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967225A05-EBRP-12.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967226A05-EBRP-12_C.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967273A64-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967273A64-EBRP-11_C.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11764967247A34-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11764967248A34-EBRP-11_C.pdf",
    },
  },
  {
    anio: 2024,
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427249A04_BRP_11-_Primaria.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431330A04_EBR-Primaria_11_clv.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427250A05_EBRP_12-_Primaria.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431330A05_EBR-Primaria_12_clv.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427265A61_EBRP_11_Primaria-Educacion-Fisica.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431353A61-EBRP-11_EBR-Primaria-Educación-Física_clv.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11733427257A34_EBRP_11_Primaria-Profesor-de-Innovación-Pedagogica.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11733431341A34-EBRP-11_EBR-Primaria-Profesor-de-Innovación-Pedagógica_clv.pdf",
    },
  },
  {
    anio: 2023,
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489394A04-EBRP-11_f1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498874A04-EBRP-11_C.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489395A05-EBRP-12_f2.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498875A05-EBRP-12_C.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489396A07-EBRP-11_f1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498876A07-EBRP-11_C.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/media/11702489397A10-EBRP-11_f1.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/media/11702498877A10-EBRP-11_C.pdf",
    },
  },
  {
    anio: 2022,
    nota: "Formato distinto: códigos A01/A02 en vez de A04/A05",
    primariaF1: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A01-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A01-EBRP-11.pdf",
    },
    primariaF2: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A02-EBRP-12.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A02-EBRP-12.pdf",
    },
    edFisica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A36-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A36-EBRP-11.pdf",
    },
    innovacionPedagogica: {
      cuadernillo:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_cuadernillos/C_A04-EBRP-11.pdf",
      claves:
        "https://evaluaciondocente.perueduca.pe/ascenso2022/ascenso2022instrumentos/pdfs_claves/A04-EBRP-11.pdf",
    },
  },
];

// ============================================================
// HOOK: revelar un bloque al entrar en pantalla (scroll reveal)
// ============================================================

function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

// ============================================================
// COMPONENTE: FILA DE DESCARGA (cuadernillo + claves)
// ============================================================

function FilaDescarga({ titulo, link }: { titulo: string; link: ExamLink }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D2D3D5] bg-[#F8F9FA] p-3.5 transition-colors hover:bg-white">
      <span className="text-xs font-bold text-[#1D232C]">{titulo}</span>
      <div className="flex gap-2">
        <a
          href={link.cuadernillo}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-[#0A1628] px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0D1F35] hover:shadow-md"
        >
          <Download size={12} />
          Preguntas
        </a>
        <a
          href={link.claves}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-[#D2D3D5] bg-white px-3.5 py-2 text-[11px] font-bold text-[#1D232C] transition-all hover:-translate-y-0.5 hover:border-[#22D3EE] hover:text-[#0A1628]"
        >
          <Download size={12} />
          Respuestas
        </a>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE: NOTA / CALLOUT
// ============================================================

function Nota({
  tono = "info",
  children,
}: {
  tono?: "info" | "advertencia";
  children: React.ReactNode;
}) {
  const estilos =
    tono === "advertencia"
      ? "border-[#F4B942]/40 bg-[#FDF3DD] text-[#7a5b0a]"
      : "border-[#22D3EE]/25 bg-[#E5FAFD] text-[#0a5a78]";
  const colorIcono = tono === "advertencia" ? "#c9930f" : "#0891A8";

  return (
    <div className={`flex gap-2.5 rounded-xl border p-4 ${estilos}`}>
      <Info size={16} className="mt-0.5 shrink-0" style={{ color: colorIcono }} />
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}

// ============================================================
// COMPONENTE: TARJETA DE CONFIANZA (simple, sin jerga técnica)
// ============================================================

function TarjetaConfianza({
  icono: Icono,
  titulo,
  texto,
}: {
  icono: React.ElementType;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="group flex gap-4 rounded-2xl border border-[#D2D3D5] bg-[#F8F9FA] p-5 transition-all hover:-translate-y-1 hover:border-[#22D3EE]/40 hover:bg-white hover:shadow-md">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A1628] text-[#22D3EE] transition-transform duration-300 group-hover:scale-110">
        <Icono size={20} />
      </div>
      <div>
        <p className="mb-1 text-sm font-black text-[#1D232C]">{titulo}</p>
        <p className="text-xs leading-relaxed text-[#5c5e63]">{texto}</p>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function CentroAprendizajePage() {
  const [esquemaActivo, setEsquemaActivo] = useState<EsquemaId>("vigente");
  const [anioExpandido, setAnioExpandido] = useState<number | null>(null);

  const heroReveal = useReveal<HTMLElement>();
  const puntajeReveal = useReveal<HTMLElement>();
  const enfoqueReveal = useReveal<HTMLElement>();
  const examenesReveal = useReveal<HTMLElement>();
  const confianzaReveal = useReveal<HTMLElement>();

  const esquemas: { id: EsquemaId; label: string }[] = [
    { id: "vigente", label: "Convocatoria actual (2022–2026)" },
    { id: "historico2018", label: "Formato antiguo (2018)" },
  ];
  const indiceActivo = esquemas.findIndex((e) => e.id === esquemaActivo);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        {/* ====================================================
            HERO — mismo lenguaje visual que el dashboard:
            navy + resplandor cian (marca Docente Smart)
        ==================================================== */}
        <header
          ref={heroReveal.ref as React.RefObject<HTMLElement>}
          className={`pd-reveal ${heroReveal.visible ? "pd-visible" : ""} relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0A1628] via-[#0D1F35] to-[#0A1628] p-6 text-white shadow-2xl border border-[#22D3EE]/10 sm:p-8 md:p-10 md:rounded-[2.5rem]`}
        >
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-4 py-1.5 text-[#22D3EE]">
              <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_10px_currentColor]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Guía para el docente
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase sm:text-4xl md:text-5xl">
              Centro de Aprendizaje
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50 md:text-base">
              Todo lo que necesitas entender antes de tu examen, explicado
              simple: cómo se saca tu puntaje, qué evalúa realmente la
              prueba y dónde conseguir material oficial para reforzar tu
              práctica.
            </p>
          </div>

          {/* Resplandor ambiental cian */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
            style={{ background: "radial-gradient(circle, #22D3EE 0%, transparent 70%)" }}
          />

          {/* Marca de agua institucional */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='500' height='500' viewBox='0 0 500 500' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='25' fill='%2322D3EE' text-anchor='middle' transform='rotate(-20 250 250)'%3EEVALUACIÓN DOCENTE — MINEDU%3C/text%3E%3C/svg%3E")`,
                backgroundSize: "400px 400px",
              }}
            />
          </div>
        </header>

        {/* NAV RÁPIDA (anclas) */}
        <nav className="no-scrollbar mb-10 flex gap-2 overflow-x-auto pb-1">
          {[
            { href: "#puntaje", label: "Tu puntaje" },
            { href: "#enfoque", label: "Qué evalúa el examen" },
            { href: "#material", label: "Material de apoyo" },
            { href: "#confianza", label: "Cómo calificamos" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full border border-[#D2D3D5] bg-white px-4 py-2 text-xs font-bold text-[#1D232C] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#22D3EE] hover:text-[#0A1628]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* ====================================================
            SECCIÓN: ¿CÓMO SE CALCULA TU PUNTAJE?
        ==================================================== */}
        <section
          id="puntaje"
          ref={puntajeReveal.ref as React.RefObject<HTMLElement>}
          className={`pd-reveal ${puntajeReveal.visible ? "pd-visible" : ""} mb-10 scroll-mt-24 rounded-2xl border border-[#D2D3D5] bg-white p-5 shadow-sm sm:p-6 md:p-8`}
        >
          <div className="mb-1 flex items-center gap-2">
            <Calculator size={20} className="text-[#0A1628]" />
            <h2 className="text-lg font-black text-[#1D232C]">
              ¿Cómo se calcula tu puntaje?
            </h2>
          </div>
          <p className="mb-5 text-xs text-[#77787A]">
            Depende de a qué convocatoria te presentas. Elige la que
            corresponda a tu examen para ver cómo se reparten los puntos.
          </p>

          {/* Tabs deslizantes */}
          <div className="relative mb-6 flex flex-col gap-1 rounded-2xl bg-[#F1F2F3] p-1 sm:flex-row">
            <div
              className="absolute inset-y-1 rounded-xl bg-[#0A1628] shadow-md transition-transform duration-300 ease-out hidden sm:block"
              style={{
                width: `calc(${100 / esquemas.length}% - 4px)`,
                transform: `translateX(calc(${indiceActivo * 100}% + ${indiceActivo * 4}px))`,
              }}
            />
            {esquemas.map((esquema) => (
              <button
                key={esquema.id}
                onClick={() => setEsquemaActivo(esquema.id)}
                className={`relative z-10 flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors ${
                  esquemaActivo === esquema.id
                    ? "bg-[#0A1628] text-white sm:bg-transparent"
                    : "text-[#5c5e63]"
                }`}
              >
                {esquema.label}
              </button>
            ))}
          </div>

          {esquemaActivo === "vigente" ? (
            <div>
              {/* Medidor de puntaje — elemento firma de esta sección */}
              <div className="mb-5 rounded-2xl border border-[#D2D3D5] bg-[#F8F9FA] p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#77787A]">
                    <Sparkles size={12} className="text-[#22D3EE]" />
                    Puntaje máximo posible
                  </span>
                  <span className="text-sm font-black text-[#0A1628]">90 pts</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#E8E9EA]">
                  <div
                    className="pd-shimmer-bar h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: puntajeReveal.visible ? "100%" : "0%" }}
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#5c5e63]">
                  Piénsalo así: la prueba tiene <strong>60 preguntas</strong>{" "}
                  y cada una que respondes bien te da{" "}
                  <strong>1.5 puntos</strong>. Si las aciertas todas, llegas a
                  los 90 puntos.
                </p>
              </div>

              <Nota tono="advertencia">
                <strong>No pierdes puntos por equivocarte.</strong> Marcar
                una respuesta y fallarla vale lo mismo que dejarla en blanco
                — así que siempre conviene responder todas las preguntas,
                aunque no estés seguro. El puntaje mínimo para aprobar
                cambia según la escala magisterial a la que postulas; revisa
                el número exacto de tu escala en el cronograma oficial de{" "}
                <a
                  href="https://evaluaciondocente.perueduca.pe/ascenso26/prueba-nacional/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline decoration-2 underline-offset-2"
                >
                  MINEDU
                </a>
                .
              </Nota>
            </div>
          ) : (
            <div>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#D2D3D5] bg-[#F8F9FA] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#77787A]">
                    Habilidades Generales
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1D232C]">
                    50 <span className="text-sm font-bold text-[#77787A]">pts</span>
                  </p>
                  <p className="mt-1 text-xs text-[#5c5e63]">
                    25 preguntas · 2 puntos cada una
                  </p>
                </div>
                <div className="rounded-2xl border border-[#D2D3D5] bg-[#F8F9FA] p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#77787A]">
                    Conocimientos Pedagógicos
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#1D232C]">
                    150 <span className="text-sm font-bold text-[#77787A]">pts</span>
                  </p>
                  <p className="mt-1 text-xs text-[#5c5e63]">
                    50 preguntas · 3 puntos cada una
                  </p>
                </div>
              </div>
              <Nota>
                Este formato de 75 preguntas y 200 puntos ya no se usa —
                corresponde a convocatorias antiguas, como la de 2018, donde
                se necesitaban <strong>110 puntos</strong> en Conocimientos
                Pedagógicos para aprobar. Lo dejamos aquí solo como
                referencia histórica, no es el formato de tu próximo examen.
              </Nota>
            </div>
          )}
        </section>

        {/* ====================================================
            SECCIÓN: QUÉ EVALÚA REALMENTE EL EXAMEN
        ==================================================== */}
        <section
          id="enfoque"
          ref={enfoqueReveal.ref as React.RefObject<HTMLElement>}
          className={`pd-reveal ${enfoqueReveal.visible ? "pd-visible" : ""} mb-10 scroll-mt-24 grid grid-cols-1 gap-5 md:grid-cols-2`}
        >
          <div className="group rounded-2xl border border-[#D2D3D5] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-[#22D3EE] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <GraduationCap size={22} />
            </div>
            <h2 className="mb-2 text-base font-black text-[#1D232C]">
              No basta con memorizar
            </h2>
            <p className="text-sm leading-relaxed text-[#5c5e63]">
              El examen no te pregunta definiciones sueltas. Te pone
              situaciones parecidas a las de tu salón de clases y quiere ver
              si sabes aplicar lo que sabes en ese momento — igual que en el
              día a día del aula.
            </p>
          </div>

          <div className="group rounded-2xl border border-[#D2D3D5] bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-[#22D3EE] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <ClipboardList size={22} />
            </div>
            <h2 className="mb-2 text-base font-black text-[#1D232C]">
              Lo que se observa de tu labor
            </h2>
            <p className="text-sm leading-relaxed text-[#5c5e63]">
              Cuando el examen habla de "desempeño docente", se fija en tres
              cosas muy concretas: si tus estudiantes participan de verdad,
              si les haces pensar y no solo repetir, y si el ambiente del
              aula es de respeto.
            </p>
          </div>
        </section>

        {/* ====================================================
            SECCIÓN: MATERIAL DE APOYO (PDFs oficiales de MINEDU)
            OJO: esto NO es nuestro simulacro, es solo material de
            referencia para que el docente no lo confunda al buscar.
            El objetivo real de esta sección es llevarlo a /examenes.
        ==================================================== */}
        <section
          id="material"
          ref={examenesReveal.ref as React.RefObject<HTMLElement>}
          className={`pd-reveal ${examenesReveal.visible ? "pd-visible" : ""} mb-10 scroll-mt-24 rounded-2xl border border-[#D2D3D5] bg-white p-5 shadow-sm sm:p-6 md:p-8`}
        >
          <div className="mb-1 flex items-center gap-2">
            <FileText size={20} className="text-[#0A1628]" />
            <h2 className="text-lg font-black text-[#1D232C]">
              Material de apoyo
            </h2>
          </div>
          <p className="mb-5 text-xs leading-relaxed text-[#77787A]">
            Estos son los cuadernillos y las respuestas oficiales que MINEDU
            publicó por su cuenta cada año. Te los dejamos aquí como
            referencia, por si quieres consultar exactamente cómo se ven las
            preguntas oficiales — pero <strong>no son tu simulacro</strong>:
            aquí solo descargas un PDF, nadie corrige tus respuestas ni te
            dice en qué fallaste.
          </p>

          {/* CTA de venta hacia el simulacro real */}
          <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#0A1628] via-[#0D1F35] to-[#0A1628] p-5 text-white sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22D3EE]/10 text-[#22D3EE]">
                <Zap size={18} />
              </div>
              <div>
                <p className="text-sm font-black">
                  ¿Quieres practicar como será tu examen real?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  En nuestro simulacro respondes en pantalla, se corrige
                  al instante y te decimos exactamente en qué tema estás
                  fallando — nada de revisar un PDF a mano.
                </p>
              </div>
            </div>
            <Link
              href="/examenes"
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#22D3EE] px-5 py-3 text-xs font-black uppercase tracking-widest text-[#0A1628] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-white sm:w-auto"
            >
              Ir a mi simulacro
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {EXAMENES_POR_ANIO.map((examen, idx) => {
              const abierto = anioExpandido === examen.anio;
              return (
                <div
                  key={examen.anio}
                  className={`pd-reveal ${examenesReveal.visible ? "pd-visible" : ""} overflow-hidden rounded-xl border border-[#D2D3D5]`}
                  style={{ animationDelay: examenesReveal.visible ? `${idx * 70}ms` : undefined }}
                >
                  <button
                    type="button"
                    onClick={() => setAnioExpandido(abierto ? null : examen.anio)}
                    className="flex w-full items-center justify-between bg-[#F8F9FA] p-4 text-left transition-colors hover:bg-[#F1F2F3]"
                  >
                    <div>
                      <span className="text-sm font-black text-[#1D232C]">
                        Ascenso {examen.anio}
                      </span>
                      {examen.nota && (
                        <span className="ml-2 text-[10px] font-bold uppercase text-[#c9930f]">
                          {examen.nota}
                        </span>
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`text-[#77787A] transition-transform duration-300 ${
                        abierto ? "rotate-180 text-[#0A1628]" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      abierto ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-2 border-t border-[#D2D3D5] p-4">
                        <FilaDescarga titulo="Primaria General — Turno 1" link={examen.primariaF1} />
                        <FilaDescarga titulo="Primaria General — Turno 2" link={examen.primariaF2} />
                        {examen.edFisica && (
                          <FilaDescarga titulo="Educación Física" link={examen.edFisica} />
                        )}
                        {examen.innovacionPedagogica && (
                          <FilaDescarga
                            titulo="Innovación Pedagógica"
                            link={examen.innovacionPedagogica}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ====================================================
            SECCIÓN: CÓMO CALIFICAMOS TU SIMULACRO
            (sin jerga técnica — solo lo que le importa al docente)
        ==================================================== */}
        <section
          id="confianza"
          ref={confianzaReveal.ref as React.RefObject<HTMLElement>}
          className={`pd-reveal ${confianzaReveal.visible ? "pd-visible" : ""} scroll-mt-24 rounded-2xl border border-[#D2D3D5] bg-white p-5 shadow-sm sm:p-6 md:p-8`}
        >
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#0A1628]" />
            <h2 className="text-lg font-black text-[#1D232C]">
              Así calificamos tu simulacro
            </h2>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-[#5c5e63]">
            Queremos que confíes en tu puntaje, así que te lo contamos sin
            vueltas:
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <TarjetaConfianza
              icono={Target}
              titulo="Corregimos pregunta por pregunta"
              texto="Comparamos cada una de tus respuestas con la clave oficial correcta, una por una. No hay adivinanza de por medio."
            />
            <TarjetaConfianza
              icono={BookOpen}
              titulo="La explicación coincide con tu nota"
              texto="Lo que te explicamos en cada pregunta viene de la misma fuente que se usó para calificarte, así que nunca se contradicen."
            />
            <TarjetaConfianza
              icono={ShieldCheck}
              titulo="Tu examen es solo tuyo"
              texto="Nadie más puede abrir ni revisar tu simulacro. Solo tú puedes ver tus resultados."
            />
          </div>
        </section>
      </main>
    </div>
  );
}