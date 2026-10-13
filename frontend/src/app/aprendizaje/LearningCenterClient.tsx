"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Calculator,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  Dumbbell,
  Lightbulb,
  ArrowLeft,
} from "lucide-react";
import {
  TIPOS_INFO,
  PUNTAJE_POR_TIPO,
  EXAMENES_ASCENSO,
  EXAMENES_NOMBRAMIENTO,
  type EsquemaPuntaje,
  type TipoExamen,
} from "./data";
import { Navbar } from "@/components/marketing/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// ============================================================
// REVEAL ON SCROLL
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
// FILA DE DESCARGA (cuadernillo + claves)
// ============================================================

function FilaDescarga({
  titulo,
  link,
  icono: Icono = FileText,
}: {
  titulo: string;
  link: any;
  icono?: React.ElementType;
}) {
  return (
    <div className="group flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md">
      {/* Cabecera de la fila */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600">
            <Icono size={15} />
          </span>

          {titulo}
        </span>

        {link.simulacroID && (
          <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 animate-pulse">
            Simulacro Gratis
          </span>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-2">
        <a
          href={link.cuadernillo}
          target="_blank"
          rel="noopener noreferrer"
          referrerPolicy="no-referrer"
          download={`Cuadernillo_${titulo.replace(/\s+/g, "_")}.pdf`}
          aria-label={`Descargar cuadernillo de ${titulo}`}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-[10px] font-black uppercase text-slate-600 transition-all hover:bg-slate-50"
        >
          <Download size={12} />
          PDF
        </a>

        {link.simulacroID ? (
          <Link
            href={`/simulacro/${link.simulacroID}`}
            className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-[10px] font-black uppercase text-white shadow-lg shadow-blue-200 transition-all hover:bg-slate-900"
          >
            <Sparkles size={12} fill="currentColor" />
            Probar Simulador
          </Link>
        ) : (
          <a
            href={link.claves}
            target="_blank"
            rel="noopener noreferrer"
            referrerPolicy="no-referrer"
            download={`Claves_${titulo.replace(/\s+/g, "_")}.pdf`}
            aria-label={`Descargar claves de ${titulo}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-[10px] font-black uppercase text-slate-600 transition-all hover:bg-slate-50"
          >
            Claves
          </a>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TARJETA DE PUNTAJE
// ============================================================

function TarjetaPuntaje({
  esquema,
  animar,
}: {
  esquema: EsquemaPuntaje;
  animar: boolean;
}) {
  if (esquema.subpruebas.length === 1) {
    const s = esquema.subpruebas[0];

    return (
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative mb-3 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <Sparkles size={13} className="text-cyan-500" />
            Puntaje máximo posible
          </span>

          <span className="text-2xl font-black leading-tight text-slate-900">
            {esquema.puntajeMaximoTotal}{" "}
            <span className="text-sm font-bold text-slate-400">pts</span>
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000 ease-out"
            style={{ width: animar ? "100%" : "0%" }}
          />
        </div>

        <p className="mt-4 max-w-md text-sm font-medium leading-relaxed tracking-wide text-slate-500">
          La prueba tiene{" "}
          <strong className="text-slate-700">
            {s.preguntas} preguntas
          </strong>
          , cada una vale{" "}
          <strong className="text-slate-700">
            {s.puntosPorPregunta} puntos
          </strong>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {esquema.subpruebas.map((s) => (
        <div
          key={s.nombre}
          className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)]"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-600/10 blur-3xl" />

          <p className="relative text-xs font-bold uppercase tracking-wide text-slate-400">
            {s.nombre}
          </p>

          <p className="relative mt-3 text-3xl font-black leading-tight text-slate-900">
            {s.puntajeMaximo}{" "}
            <span className="text-sm font-bold text-slate-400">pts</span>
          </p>

          {s.minimo && (
            <p className="relative mt-2 text-xs font-medium tracking-wide text-slate-500">
              Mínimo para aprobar esta subprueba:{" "}
              <strong className="text-slate-700">{s.minimo} pts</strong>
            </p>
          )}
        </div>
      ))}

      {esquema.minimoTotal && (
        <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4 sm:col-span-2">
          <ShieldCheck size={18} className="shrink-0 text-blue-600" />

          <p className="text-sm font-medium tracking-wide text-blue-900">
            Puntaje mínimo total para aprobar:{" "}
            <strong>
              {esquema.minimoTotal} de {esquema.puntajeMaximoTotal} pts
            </strong>
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CABECERA DE EXAMEN
// Título clickeable -> /aprendizaje/{tipo}/{anio}
// ============================================================

function CabeceraExamen({
  tipoExamen,
  anio,
}: {
  tipoExamen: TipoExamen;
  anio: string | number;
}) {
  return (
    <Link
      href={`/aprendizaje/${tipoExamen}/${anio}`}
      className="group mb-5 flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
          <FileText size={24} />
        </div>

        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
            Evaluación {anio}
          </h3>

          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Ver detalles y descargas{" "}
            <ArrowRight className="inline" size={10} />
          </p>
        </div>
      </div>

      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold tracking-wide text-slate-500">
        Primaria
      </span>
    </Link>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function LearningCenterClient() {
  const [tipoExamen, setTipoExamen] = useState<TipoExamen>("ascenso");

  const heroReveal = useReveal<HTMLElement>();
  const puntajeReveal = useReveal<HTMLElement>();
  const examenesReveal = useReveal<HTMLElement>();

  // --- Navegación "Volver" ---
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [hasInternalHistory, setHasInternalHistory] = useState(false);

  useEffect(() => {
    try {
      const sameOrigin =
        document.referrer &&
        new URL(document.referrer).origin === window.location.origin;
      setHasInternalHistory(Boolean(sameOrigin) && window.history.length > 1);
    } catch {
      setHasInternalHistory(false);
    }
  }, []);

  function handleBack() {
    if (isLoading) return;
    if (hasInternalHistory) {
      router.back();
      return;
    }
    router.push(user ? "/examenes" : "/");
  }
  // --- Fin navegación "Volver" ---

  const esquemaActivo = PUNTAJE_POR_TIPO[tipoExamen];

  const examenesActivos =
    tipoExamen === "ascenso"
      ? EXAMENES_ASCENSO
      : EXAMENES_NOMBRAMIENTO;

  const infoActiva = TIPOS_INFO[tipoExamen];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <button
          type="button"
          onClick={handleBack}
          disabled={isLoading}
          aria-label="Volver"
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-400 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={14} />
          Volver
        </button>

        {/* HERO */}
        <header
          ref={heroReveal.ref as any}
          className={`relative mb-14 overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 shadow-[0_30px_80px_rgba(15,_23,_42,_0.35)] transition-all duration-700 ease-out sm:p-16 ${
            heroReveal.visible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          <div className="pointer-events-none absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-blue-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-cyan-300">
              <ShieldCheck size={14} />

              <span className="text-xs font-bold tracking-wide">
                Material oficial MINEDU · 100% gratuito
              </span>
            </div>

            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
              Centro de Aprendizaje para el docente peruano
            </h1>

            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed tracking-wide text-slate-400">
              Cuadernillos y claves oficiales de Ascenso y Nombramiento
              Docente, organizados por año, listos para descargar. Entiende
              cómo se reparte el puntaje antes de tu examen del MINEDU.
            </p>
          </div>
        </header>

        {/* SELECTOR */}
        <div className="mb-10 flex w-fit gap-1.5 rounded-2xl bg-slate-100 p-1.5">
          {(["ascenso", "nombramiento"] as TipoExamen[]).map((t) => (
            <button
              key={t}
              onClick={() => setTipoExamen(t)}
              className={`rounded-xl px-7 py-3 text-xs font-bold tracking-wide transition-all ${
                tipoExamen === t
                  ? "bg-white text-blue-600 shadow-[0_8px_20px_rgba(37,_99,_235,_0.15)]"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {TIPOS_INFO[t].label}
            </button>
          ))}
        </div>

        <p className="-mt-6 mb-12 max-w-xl text-sm font-medium leading-relaxed tracking-wide text-slate-500">
          {infoActiva.descripcion}{" "}
          <span className="text-slate-400">
            — {infoActiva.fechaInfo}
          </span>
        </p>

        {/* PUNTAJE */}
        <section
          id="puntaje"
          ref={puntajeReveal.ref as any}
          className={`mb-16 scroll-mt-24 transition-all duration-700 ease-out ${
            puntajeReveal.visible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-black leading-tight text-slate-900">
            <Calculator className="text-blue-600" size={22} />
            Esquema de puntaje: {infoActiva.label}
          </h2>

          <TarjetaPuntaje
            esquema={esquemaActivo}
            animar={puntajeReveal.visible}
          />

          <a
            href={esquemaActivo.urlOficial}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-400 hover:text-blue-600"
          >
            Ver fuente oficial en perueduca.pe{" "}
            <ArrowRight size={12} />
          </a>
        </section>

        {/* MATERIAL */}
        <section
          id="material"
          ref={examenesReveal.ref as any}
          className={`mb-16 scroll-mt-24 transition-all duration-700 ease-out ${
            examenesReveal.visible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="mb-6 text-2xl font-black leading-tight text-slate-900">
            Cuadernillos y claves de {infoActiva.label} por año
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {examenesActivos.map((examen) => (
              <div
                key={examen.anio}
                className="rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-[0_20px_50px_rgba(8,_112,_184,_0.06)] transition-shadow hover:shadow-[0_25px_60px_rgba(8,_112,_184,_0.12)]"
              >
                {/* Título -> /aprendizaje/{tipoExamen}/{anio} */}
                <CabeceraExamen
                  tipoExamen={tipoExamen}
                  anio={examen.anio}
                />

                {examen.nota && (
                  <p className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed tracking-wide text-amber-800">
                    {examen.nota}
                  </p>
                )}

                <div className="space-y-2.5">
                  <FilaDescarga
                    titulo="Primaria — Forma 1"
                    link={examen.primariaF1}
                  />

                  <FilaDescarga
                    titulo="Primaria — Forma 2"
                    link={examen.primariaF2}
                  />

                  {examen.edFisica && (
                    <FilaDescarga
                      titulo={
                        examen.edFisicaLabel ?? "Educación Física"
                      }
                      link={examen.edFisica}
                      icono={Dumbbell}
                    />
                  )}

                  {examen.innovacionPedagogica && (
                    <FilaDescarga
                      titulo={
                        examen.innovacionLabel ??
                        "Innovación Pedagógica"
                      }
                      link={examen.innovacionPedagogica}
                      icono={Lightbulb}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-8 shadow-[0_30px_80px_rgba(15,_23,_42,_0.3)] sm:p-14">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-blue-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />

          <div className="relative flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="text-center md:text-left">
              {/* PLACEHOLDER: editar/quitar cuando cambie la promoción */}
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-emerald-300">
                <Sparkles size={12} />
                Por ahora, solo el examen de Nombramiento 2018 es 100%
                gratis
              </span>

              <h2 className="text-3xl font-black leading-tight text-white">
                ¿Listo para el simulacro real?
              </h2>

              <p className="mt-3 max-w-md text-sm font-medium leading-relaxed tracking-wide text-slate-400">
                No solo descargues PDFs: practica con nuestro simulacro
                cronometrado y compárate con docentes de todo el Perú en
                el ranking nacional.
              </p>
            </div>

            <Link
              href="/registro"
              className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-8 py-4 text-xs font-bold tracking-wide text-blue-600 shadow-[0_15px_35px_rgba(255,_255,_255,_0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(255,_255,_255,_0.25)]"
            >
              Empezar gratis <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}