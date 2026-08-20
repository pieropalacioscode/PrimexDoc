"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getAnaliticaIntento,
  AnaliticaIntento,
} from "@/services/historialService";
import { RadarDominio } from "@/components/analytics/RadarDominio";
import {
  AlertCircle,
  Lightbulb,
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Target,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function AnaliticaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string; // Extracción de 'id' desde los parámetros dinámicos

  const [data, setData] = useState<AnaliticaIntento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(false);

    getAnaliticaIntento(id)
      .then((res) => {
        setData(res);
      })
      .catch((err) => {
        console.error("Error al obtener la analítica:", err);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // ============================================================
  // ESTADO DE ERROR
  // ============================================================
  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-3xl border border-rose-100 bg-white p-8 shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-600" />
          <h2 className="text-xl font-bold text-slate-800">
            Error al cargar el diagnóstico
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            No se pudieron recuperar las métricas avanzadas para esta evaluación.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700"
          >
            <ArrowLeft size={16} /> Volver a la revisión
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ESTADO DE CARGA
  // ============================================================
  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="font-medium text-slate-600">
            Generando analítica avanzada y mapa de competencias...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // VISTA PRINCIPAL DEL DIAGNÓSTICO
  // ============================================================
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 pb-20">
      {/* NAVEGACIÓN Y CABECERA */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft size={16} /> VOLVER A LA LISTA DE PREGUNTAS
      </button>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Diagnóstico Pro
        </h1>
        <p className="text-lg font-medium text-slate-500">
          Analizamos tu lógica en este examen para optimizar tu plan de estudio.
        </p>
      </header>

      {/* BLOQUE PRINCIPAL: RADAR + RECOMENDACIÓN SMART */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* GRÁFICO RADAR FLEXIBLE */}
        <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 sm:p-8">
          <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
            <TrendingUp className="text-blue-600" size={24} />
            Equilibrio de Capacidades
          </h3>

          <div className="flex min-h-[350px] w-full items-center justify-center">
            {/* RadarDominio ya acepta 2 o más áreas, así que no necesitamos
                el fallback de barras que usábamos con RadarDesempeño. */}
            <RadarDominio data={data.por_subprueba} />
          </div>

          <p className="mt-4 text-center text-[10px] italic text-slate-400">
            Este gráfico muestra tu nivel de dominio actual basado en las
            respuestas correctas por subprueba.
          </p>
        </div>

        {/* TARJETA DE RECOMENDACIÓN */}
        <div className="flex flex-col justify-between rounded-[2.5rem] bg-blue-900 p-8 text-white shadow-xl shadow-blue-100">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-700 bg-blue-800">
              <Lightbulb className="text-cyan-400" size={28} />
            </div>
            <h3 className="mb-4 text-2xl font-black leading-tight">
              Recomendación Smart
            </h3>
            <p className="text-lg leading-relaxed text-blue-100/80">
              {data.recomendacion ||
                "Continúa repasando las áreas pedagógicas con mayor margen de mejora para asegurar la máxima puntuación en la prueba oficial."}
            </p>
          </div>

          <button
            onClick={() => router.push("/simulacro")}
            className="mt-8 w-full rounded-2xl bg-cyan-500 py-4 font-black text-slate-900 shadow-lg shadow-cyan-900/20 transition-all hover:bg-cyan-400 active:scale-95"
          >
            REFORZAR AHORA
          </button>
        </div>
      </div>
    </div>
  );
}