// Ruta destino: frontend/src/app/(dashboard)/resultados/[id]/page.tsx
//
// ============================================================
// REVISIÓN DE EXAMEN — VERSIÓN FUSIONADA E INTELIGENTE
// ============================================================
// Este archivo combina lo mejor de dos versiones previas del
// componente de resultados:
//
//  1) Normalización ROBUSTA de opciones de respuesta: soporta
//     `opciones_json`, `opciones` o `alternativas`, en formato
//     arreglo u objeto, generando siempre las etiquetas A, B, C, D...
//     aunque el backend no las envíe explícitamente. Esto evita
//     pantallas en blanco cuando el backend cambia de forma.
//
//  2) Renderizado enriquecido de texto (QuestionText / InlineText)
//     para enunciados, textos base y sustento pedagógico, en vez
//     de texto plano — soporta fórmulas / formato especial.
//
//  3) Analítica avanzada: radar de dominio por subprueba o por
//     componente pedagógico, y panel de "Diagnóstico Smart" con
//     reintento ante fallos de red.
//
//  4) Filtros combinables: por estado (correctas/incorrectas/
//     omitidas) y por componente temático, con chips horizontales.
//
//  5) Modo lectura global (oculta los textos base para practicar
//     memoria/velocidad) + colapso individual por pregunta.
//
//  6) Lectura en voz alta (Web Speech API) con cola de fragmentos,
//     pausa/reanudación real y voz en español latino. Ver el bloque
//     "LECTOR DE VOZ" más abajo para el detalle de los bugs de
//     navegador que resuelve.
//
//  7) Mapa de preguntas (píldoras numeradas) con salto directo,
//     resaltado temporal y scroll suave — disponible como sidebar
//     fijo en escritorio y como hoja inferior (bottom sheet) en
//     móvil, con bloqueo de scroll del body mientras está abierta.
//
//  8) Paginación de 10 preguntas por página, robusta ante cambios
//     de filtro (siempre vuelve a página 1) y ante saltos desde el
//     mapa (calcula automáticamente la página destino).
//
// El objetivo: que el estudiante nunca pierda información (todas
// las alternativas siempre visibles), que la interfaz sea clara
// a simple vista (colores consistentes: verde = correcta, rojo =
// error del usuario, ámbar = omitida) y que la app no se rompa
// ante datos parciales o mal formados del backend.
// ============================================================

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/services/api";
import { QuestionText, InlineText } from "@/components/exam/QuestionText";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Info,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Target,
  Award,
  Filter,
  Volume2,
  LayoutGrid,
  X,
  Lightbulb,
  EyeOff,
  Eye,
  Pause,
  Play,
} from "lucide-react";

// ============================================================
// TIPOS E INTERFACES
// ============================================================

export interface OpcionResultado {
  id: string;
  etiqueta: string;
  texto_opcion: string;
  es_correcta?: boolean;
}

// El backend históricamente ha enviado las alternativas bajo tres
// nombres distintos (`opciones_json`, `opciones`, `alternativas`) y en
// dos formas distintas (arreglo u objeto/diccionario). Tipamos todas
// las variantes como posibles para que TypeScript no se queje y la
// normalización pueda encargarse de unificarlas en tiempo de ejecución.
type OpcionesCrudas = OpcionResultado[] | Record<string, any> | undefined | null;

export interface DetallePregunta {
  pregunta_id: string;
  numero_pregunta: number;
  enunciado: string;
  texto_base_contenido?: string | null;
  explicacion?: string | null;
  sustento?: string | null;
  opcion_seleccionada_id?: string | null;
  opcion_correcta_id: string;
  es_correcta: boolean;
  opciones_json?: OpcionesCrudas;
  opciones?: OpcionesCrudas;
  alternativas?: OpcionesCrudas;
  componente?: string | null;
}

export interface ResumenResultado {
  examen_titulo?: string;
  puntaje?: number;
  puntaje_maximo?: number;
  porcentaje?: number;
  total_preguntas?: number;
  preguntas_correctas?: number;
  preguntas_incorrectas?: number;
  respuestas_omitidas?: number;
  tiempo_empleado_segundos?: number;
}

// Punto de dominio por área temática (subprueba), tal como lo envía el backend
export interface AnaliticaData {
  area: string;
  porcentaje: number;
  correctas?: number;
  total?: number;
}

// Dominio por componente pedagógico específico
export interface ComponenteData {
  componente: string;
  aciertos: number;
  total: number;
  porcentaje: number;
}

// Forma interna ya normalizada que consume el resto del componente.
export interface AnaliticaFullResponse {
  intento_id: string;
  subpruebas: AnaliticaData[];
  componentes: ComponenteData[];
  debilidades: string[];
  recomendacion: string;
}

// ------------------------------------------------------------
// Forma CRUDA del backend: se tipa como Record<string, any> a propósito.
// El endpoint /analitica/intento/:id ha respondido con al menos dos
// convenciones de nombres distintas a lo largo del proyecto
// (por_subprueba/por_componente en un momento, subpruebas/componentes
// en otro, y potencialmente PascalCase si Go serializa sin json tags
// explícitos). En vez de acoplarnos a una sola forma y romper el radar
// cada vez que el backend cambie, extraemos el arreglo probando TODAS
// las variantes conocidas — el mismo patrón robusto que ya usamos para
// normalizar las opciones de respuesta (opciones_json/opciones/alternativas).
// ------------------------------------------------------------
type AnaliticaApiCruda = Record<string, any>;

// Busca el primer arreglo no vacío entre varias claves posibles del objeto.
function extraerArregloFlexible(raw: Record<string, any>, claves: string[]): any[] {
  for (const clave of claves) {
    const valor = raw?.[clave];
    if (Array.isArray(valor) && valor.length > 0) return valor;
  }
  // Si todas vinieron vacías, devolvemos la primera que exista como arreglo
  // (aunque esté vacía) para no perder la señal de "sí existe pero sin datos".
  for (const clave of claves) {
    if (Array.isArray(raw?.[clave])) return raw[clave];
  }
  return [];
}

// Lee el primer valor definido entre varias claves posibles de un objeto
// (soporta snake_case y PascalCase indistintamente).
function leerCampoFlexible<T = any>(obj: Record<string, any>, claves: string[]): T | undefined {
  for (const clave of claves) {
    if (obj?.[clave] !== undefined && obj?.[clave] !== null) return obj[clave];
  }
  return undefined;
}

function normalizarAnalitica(raw: AnaliticaApiCruda): AnaliticaFullResponse {
  const rowsSub = extraerArregloFlexible(raw, [
    "por_subprueba",
    "subpruebas",
    "Subpruebas",
    "PorSubprueba",
  ]);

  const rowsComp = extraerArregloFlexible(raw, [
    "por_componente",
    "componentes",
    "Componentes",
    "PorComponente",
  ]);

  const subpruebas: AnaliticaData[] = rowsSub.map((s) => {
    const area = leerCampoFlexible<string>(s, ["subprueba", "area", "Subprueba", "Area"]) ?? "General";
    const total = leerCampoFlexible<number>(s, ["total_preguntas", "total", "TotalPreguntas", "Total"]) ?? 0;
    const correctas = leerCampoFlexible<number>(s, ["correctas", "aciertos", "Correctas", "Aciertos"]) ?? 0;
    const porcentaje =
      leerCampoFlexible<number>(s, ["porcentaje_exito", "porcentaje", "PorcentajeExito", "Porcentaje"]) ??
      (total ? (correctas / total) * 100 : 0);

    return { area, porcentaje, correctas, total };
  });

  const componentes: ComponenteData[] = rowsComp.map((c) => {
    const componente = leerCampoFlexible<string>(c, ["componente", "Componente"]) ?? "General";
    const total = leerCampoFlexible<number>(c, ["total", "Total"]) ?? 0;
    const aciertos = leerCampoFlexible<number>(c, ["aciertos", "correctas", "Aciertos", "Correctas"]) ?? 0;
    const porcentaje =
      leerCampoFlexible<number>(c, ["porcentaje_exito", "porcentaje", "PorcentajeExito", "Porcentaje"]) ??
      (total ? (aciertos / total) * 100 : 0);

    return { componente, aciertos, total, porcentaje };
  });

  const debilidades =
    leerCampoFlexible<string[]>(raw, ["debilidades", "Debilidades"]) ?? [];
  const recomendacion =
    leerCampoFlexible<string>(raw, ["recomendacion", "Recomendacion"]) ?? "";
  const intentoId =
    leerCampoFlexible<string>(raw, ["intento_id", "IntentoID", "intentoId"]) ?? "";

  return {
    intento_id: intentoId,
    subpruebas,
    componentes,
    debilidades,
    recomendacion,
  };
}
// ============================================================
// UTILIDAD: Genera el rango de páginas a mostrar (con elipsis)
// ============================================================
  function getRangoPaginas(
    paginaActual: number,
    totalPaginas: number
  ): (number | "dots")[] {
    const DELTA = 1;

    if (totalPaginas <= 7) {
      return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    }

    const rango: (number | "dots")[] = [];
    const izquierda = Math.max(2, paginaActual - DELTA);
    const derecha = Math.min(totalPaginas - 1, paginaActual + DELTA);

    rango.push(1);
    if (izquierda > 2) rango.push("dots");
    for (let i = izquierda; i <= derecha; i++) rango.push(i);
    if (derecha < totalPaginas - 1) rango.push("dots");
    rango.push(totalPaginas);

    return rango;
  }


// El backend a veces devuelve un arreglo plano de preguntas y a veces un
// objeto { preguntas, resumen }. Tipamos ambos casos en vez de usar `any`.
interface ResultadosApiObjeto {
  preguntas?: DetallePregunta[];
  resumen?: ResumenResultado;
}
type ResultadosApiResponse = ResultadosApiObjeto | DetallePregunta[];

const PREGUNTAS_POR_PAGINA = 10;

// ============================================================
// HELPERS & ADAPTADORES DE OPCIONES
// ============================================================

/**
 * Normaliza las opciones de respuesta desde cualquier formato del backend
 * (opciones_json, opciones, alternativas — en arreglo u objeto) garantizando
 * que se muestren TODAS las alternativas disponibles (A, B, C, D...) con su
 * etiqueta correcta, incluso si el backend no envía `etiqueta` o `es_correcta`
 * explícitamente. Esta es la única fuente de verdad para renderizar opciones
 * en toda la pantalla: evita duplicar lógica de "cuál es la correcta" en
 * distintos puntos del componente.
 */
function normalizarOpcionesPregunta(item: DetallePregunta): OpcionResultado[] {
  const raw = item.opciones_json || item.opciones || item.alternativas || [];

  let lista: any[] = [];
  if (Array.isArray(raw)) {
    lista = raw;
  } else if (raw && typeof raw === "object") {
    lista = Object.entries(raw).map(([key, val]: [string, any]) => ({
      id: val?.id ?? key,
      ...val,
    }));
  }
  return lista.map((o: any, idx: number) => {
    const idStr = String(o.id ?? idx);
    // Confiamos en el flag `es_correcta` si viene del backend; si no,
    // comparamos contra `opcion_correcta_id` de la pregunta (String() para
    // evitar fallos por tipos distintos: UUID vs string plano, etc.)
    const esCorrecta = !!o.es_correcta || idStr === String(item.opcion_correcta_id);
    const etiquetaFallback = String.fromCharCode(65 + idx); // Genera A, B, C, D...

    return {
      id: idStr,
      etiqueta: (o.etiqueta || o.letra || etiquetaFallback).toString().trim(),
      texto_opcion: (o.texto_opcion || o.texto || "").toString().trim(),
      es_correcta: esCorrecta,
    };
  });
}

// ============================================================
// LECTOR DE VOZ (Web Speech API)
// ------------------------------------------------------------
// Problemas reales de navegador que resuelve esta implementación:
//
//  1) Chrome corta cualquier utterance de más de ~15 s. Una pregunta
//     con texto base + enunciado + 4 alternativas siempre supera ese
//     límite, así que la lectura se cortaba sola a media frase. Ahora
//     el texto se parte en fragmentos cortos que se encolan uno a uno.
//
//  2) `cancel()` seguido de `speak()` en el mismo tick es ignorado por
//     Chrome (el audio simplemente nunca arranca). Solo esperamos ese
//     tick cuando de verdad hay algo sonando; si no hay nada, hablamos
//     dentro del gesto del usuario, que es lo que exige iOS Safari.
//
//  3) `pause()` no funciona en Chrome para Android: si tras pausar el
//     motor sigue hablando, cortamos y guardamos el índice del fragmento
//     para reanudar exactamente desde ahí.
//
//  4) `getVoices()` devuelve una lista vacía en el primer render de
//     muchos móviles y no siempre dispara 'voiceschanged': por eso hay
//     reintentos escalonados de carga.
// ============================================================

export type EstadoAudio = "inactivo" | "reproduciendo" | "pausado";

// Limpia markdown, HTML y viñetas para que la voz no lea símbolos sueltos.
function limpiarTextoParaAudio(texto?: string | null): string {
  if (!texto) return "";
  return texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/[*_#>`~]/g, " ")
    .replace(/^\s*[-•]\s*/gm, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

// Parte el texto por oraciones (y por espacios si una oración es larguísima).
function dividirEnFragmentos(texto: string, maximo = 170): string[] {
  const oraciones = texto.match(/[^.!?…]+[.!?…]*/g) || [texto];
  const fragmentos: string[] = [];
  let actual = "";

  const empujar = () => {
    const limpio = actual.trim();
    if (limpio) fragmentos.push(limpio);
    actual = "";
  };

  for (const bruta of oraciones) {
    const pieza = bruta.trim();
    if (!pieza) continue;

    if ((actual + " " + pieza).trim().length <= maximo) {
      actual = (actual + " " + pieza).trim();
      continue;
    }

    empujar();

    if (pieza.length <= maximo) {
      actual = pieza;
    } else {
      let resto = pieza;
      while (resto.length > maximo) {
        let corte = resto.lastIndexOf(" ", maximo);
        if (corte < maximo * 0.5) corte = maximo;
        fragmentos.push(resto.slice(0, corte).trim());
        resto = resto.slice(corte).trim();
      }
      actual = resto;
    }
  }

  empujar();
  return fragmentos.filter(Boolean);
}

// Elige la voz en español más natural disponible, priorizando motores
// neuronales y variantes latinoamericanas antes que cualquier otra.
function elegirMejorVoz(voces: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const esVoces = voces.filter((v) => v.lang?.toLowerCase().startsWith("es"));
  if (esVoces.length === 0) return undefined;

  const nombresPreferidos = [
    "google español de estados unidos",
    "google español",
    "microsoft camila",
    "microsoft dalia",
    "microsoft sabina",
    "microsoft helena",
    "microsoft paulina",
    "paulina",
    "camila",
    "mónica",
    "monica",
    "lucía",
    "lucia",
    "esperanza",
    "jorge",
    "pablo",
  ];

  for (const nombre of nombresPreferidos) {
    const encontrada = esVoces.find((v) => v.name.toLowerCase().includes(nombre));
    if (encontrada) return encontrada;
  }

  return (
    esVoces.find((v) => v.lang === "es-PE") ||
    esVoces.find((v) => v.lang === "es-419") ||
    esVoces.find((v) => v.lang === "es-MX") ||
    esVoces.find((v) => v.lang === "es-US") ||
    esVoces.find((v) => v.lang === "es-ES") ||
    esVoces[0]
  );
}

function useLecturaVoz() {
  const [idActivo, setIdActivo] = useState<string | null>(null);
  const [pausado, setPausado] = useState(false);
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);

  const idRef = useRef<string | null>(null);
  const pausadoRef = useRef(false);
  const colaRef = useRef<string[]>([]);
  const indiceRef = useRef(0);
  const cortadoRef = useRef(false);
  const vocesRef = useRef<SpeechSynthesisVoice[]>([]);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reproducirRef = useRef<() => void>(() => {});

  const soportado = typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";

  vocesRef.current = voces;
  pausadoRef.current = pausado;

  // Carga de voces con reintentos (los móviles no siempre emiten el evento)
  useEffect(() => {
    if (!soportado) return;
    const cargar = () => {
      const lista = window.speechSynthesis.getVoices();
      if (lista && lista.length) setVoces(lista);
    };
    cargar();
    window.speechSynthesis.addEventListener("voiceschanged", cargar);
    const reintentos = [250, 700, 1500, 3000].map((ms) => setTimeout(cargar, ms));
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", cargar);
      reintentos.forEach(clearTimeout);
    };
  }, [soportado]);

  const pararWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const finalizar = useCallback(() => {
    pararWatchdog();
    colaRef.current = [];
    indiceRef.current = 0;
    idRef.current = null;
    setIdActivo(null);
    setPausado(false);
  }, [pararWatchdog]);

  // Reproductor de la cola: habla un fragmento y encadena el siguiente.
  reproducirRef.current = () => {
    if (!soportado) return;
    const sintetizador = window.speechSynthesis;
    const fragmentos = colaRef.current;

    if (indiceRef.current >= fragmentos.length) {
      finalizar();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(fragmentos[indiceRef.current]);
    const voz = elegirMejorVoz(vocesRef.current);
    if (voz) {
      utterance.voice = voz;
      utterance.lang = voz.lang;
    } else {
      utterance.lang = "es-PE";
    }
    utterance.rate = 0.95; // ritmo docente: claro y sin prisa
    utterance.pitch = 1.05; // un punto más cálido
    utterance.volume = 1;

    utterance.onend = () => {
      if (cortadoRef.current) return; // corte manual: no avanzamos de fragmento
      indiceRef.current += 1;
      reproducirRef.current();
    };
    utterance.onerror = () => {
      if (cortadoRef.current) return;
      indiceRef.current += 1;
      reproducirRef.current();
    };

    sintetizador.speak(utterance);
  };

  // Chrome "duerme" el sintetizador en lecturas largas: lo despertamos.
  const iniciarWatchdog = useCallback(() => {
    pararWatchdog();
    watchdogRef.current = setInterval(() => {
      if (!soportado || !idRef.current) {
        pararWatchdog();
        return;
      }
      if (pausadoRef.current) return;
      const s = window.speechSynthesis;
      if (s.speaking && !s.paused) s.resume();
    }, 9000);
  }, [pararWatchdog, soportado]);

  const detener = useCallback(() => {
    if (!soportado) return;
    cortadoRef.current = true;
    window.speechSynthesis.cancel();
    finalizar();
  }, [finalizar, soportado]);

  /**
   * Único punto de entrada para los botones: si ese mismo contenido ya
   * está sonando, alterna pausa/reanudación; si no, arranca la lectura
   * (cortando cualquier otra que estuviera en curso).
   */
  const alternar = useCallback(
    (id: string, texto: string) => {
      if (!soportado) return;
      const sintetizador = window.speechSynthesis;

      if (idRef.current === id) {
        if (pausadoRef.current) {
          if (cortadoRef.current) {
            // Reanudamos re-hablando el fragmento donde nos quedamos
            cortadoRef.current = false;
            reproducirRef.current();
          } else {
            sintetizador.resume();
          }
          setPausado(false);
        } else {
          sintetizador.pause();
          setPausado(true);
          // Fallback Android: si pause() no surtió efecto, cortamos.
          setTimeout(() => {
            if (idRef.current === id && sintetizador.speaking && !sintetizador.paused) {
              cortadoRef.current = true;
              sintetizador.cancel();
            }
          }, 180);
        }
        return;
      }

      const limpio = limpiarTextoParaAudio(texto);
      if (!limpio) return;

      cortadoRef.current = false;
      colaRef.current = dividirEnFragmentos(limpio);
      indiceRef.current = 0;
      idRef.current = id;
      setIdActivo(id);
      setPausado(false);

      const arrancar = () => {
        if (idRef.current !== id) return;
        reproducirRef.current();
        iniciarWatchdog();
      };

      if (sintetizador.speaking || sintetizador.pending) {
        // Hay audio previo: cancelamos y esperamos un tick (bug de Chrome)
        sintetizador.cancel();
        setTimeout(arrancar, 140);
      } else {
        // Sin audio previo: arrancamos DENTRO del gesto del usuario (iOS)
        arrancar();
      }
    },
    [iniciarWatchdog, soportado]
  );

  // Limpieza al desmontar la pantalla
  useEffect(() => {
    return () => {
      if (soportado) window.speechSynthesis.cancel();
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, [soportado]);

  const estadoDe = useCallback(
    (id: string): EstadoAudio => {
      if (idActivo !== id) return "inactivo";
      return pausado ? "pausado" : "reproduciendo";
    },
    [idActivo, pausado]
  );

  return { idActivo, pausado, soportado, alternar, detener, estadoDe };
}

// Arma el texto a leer: texto base (si está visible) + enunciado + alternativas
function construirTextoLectura(
  item: DetallePregunta,
  opciones: OpcionResultado[],
  incluirTextoBase: boolean
): string {
  const partes: string[] = [];
  if (incluirTextoBase && item.texto_base_contenido) {
    partes.push(item.texto_base_contenido);
  }
  partes.push(item.enunciado);
  opciones.forEach((op) => {
    partes.push(`Opción ${op.etiqueta}. ${op.texto_opcion}`);
  });
  return partes.join(". ");
}

// ============================================================
// UI: ecualizador animado + botón de escucha
// ------------------------------------------------------------
// Mientras la voz suena, tres barras se mueven al ritmo; al pasar el
// cursor (o al enfocar con teclado) el ecualizador se reemplaza por el
// icono de pausa, que es la acción real del botón. En pausa se ve el
// icono de reanudar. La animación respeta prefers-reduced-motion.
// ============================================================
function Ecualizador() {
  return (
    <span className="ds-eq" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function BotonEscuchar({
  estado,
  onAlternar,
  onDetener,
  disabled,
}: {
  estado: EstadoAudio;
  onAlternar: () => void;
  onDetener: () => void;
  disabled?: boolean;
}) {
  const activo = estado !== "inactivo";
  const etiqueta =
    estado === "reproduciendo"
      ? "Pausar lectura"
      : estado === "pausado"
      ? "Reanudar lectura"
      : "Escuchar la pregunta completa";

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onAlternar}
        disabled={disabled}
        aria-label={etiqueta}
        title={disabled ? "Lectura en voz alta no disponible en este navegador" : etiqueta}
        className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
          estado === "reproduciendo"
            ? "ds-halo bg-blue-600 text-white"
            : estado === "pausado"
            ? "bg-blue-100 text-blue-700"
            : "bg-slate-900 text-white hover:bg-blue-600 active:scale-95"
        }`}
      >
        {estado === "reproduciendo" ? (
          <>
            <span className="transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0">
              <Ecualizador />
            </span>
            <Pause
              size={18}
              className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            />
          </>
        ) : estado === "pausado" ? (
          <Play size={18} className="ml-0.5" />
        ) : (
          <Volume2 size={18} />
        )}
      </button>

      {activo && (
        <button
          type="button"
          onClick={onDetener}
          aria-label="Detener lectura"
          title="Detener lectura"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 animate-in fade-in slide-in-from-right-2 duration-200"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ============================================================
// UTILIDADES DE ESTILO PARA LAS ALTERNATIVAS
// ------------------------------------------------------------
// Reglas, en orden de prioridad:
//  1) Si es la alternativa correcta -> siempre verde, la haya
//     marcado el usuario o no.
//  2) Si el usuario la marcó y NO era correcta -> roja.
//  3) Cualquier otra opción -> neutra y atenuada, para que las
//     dos que sí importan (correcta / marcada-incorrecta) resalten.
// ============================================================
function obtenerEstilosOpcion(esCorrecta: boolean, esSeleccionada: boolean) {
  if (esCorrecta) {
    return {
      card: "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm",
      badge: "bg-emerald-500 text-white shadow-md",
      etiquetaTexto: "text-emerald-700",
      pill: "text-emerald-700 bg-emerald-100 border-emerald-200",
      pillTexto: "Respuesta Correcta",
    };
  }
  if (esSeleccionada && !esCorrecta) {
    return {
      card: "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 shadow-sm",
      badge: "bg-rose-500 text-white shadow-md",
      etiquetaTexto: "text-rose-700",
      pill: "text-rose-700 bg-rose-100 border-rose-200",
      pillTexto: "Tu Respuesta",
    };
  }
  return {
    card: "border-slate-200 text-slate-400 bg-white opacity-70 hover:opacity-100 transition-opacity",
    badge: "bg-slate-100 text-slate-400 border border-slate-200",
    etiquetaTexto: "text-slate-400",
    pill: "",
    pillTexto: "",
  };
}

function formatTiempo(segundos?: number): string {
  if (!segundos || segundos <= 0) return "N/A";
  const minutos = Math.floor(segundos / 60);
  return minutos > 0 ? `${minutos}m` : "<1m";
}

// ============================================================
// MAPA DE PREGUNTAS: estado por pregunta + estilos de píldora
// ============================================================
type EstadoPregunta = "correcta" | "incorrecta" | "omitida";

function estadoDePregunta(item: DetallePregunta): EstadoPregunta {
  if (item.es_correcta) return "correcta";
  if (item.opcion_seleccionada_id) return "incorrecta";
  return "omitida";
}

function clasePildoraResultado(estado: EstadoPregunta, resaltada: boolean): string {
  let clase =
    estado === "correcta"
      ? "bg-emerald-500 text-white border-transparent font-extrabold shadow-sm hover:bg-emerald-600"
      : estado === "incorrecta"
      ? "bg-rose-500 text-white border-transparent font-extrabold shadow-sm hover:bg-rose-600"
      : "bg-amber-100 text-amber-700 border border-amber-300 font-extrabold hover:bg-amber-200";
  if (resaltada) clase += " ring-4 ring-blue-600/40 scale-110 z-10";
  return clase;
}
// ============================================================
// COLOR DINÁMICO POR COMPONENTE PEDAGÓGICO
// ------------------------------------------------------------
// Cada componente (Razonamiento Lógico, Comprensión Lectora, CTA,
// Matemática, etc.) recibe un color estable calculado a partir de
// un hash simple de su nombre. Así, sin importar cuántos componentes
// envíe el backend ni en qué orden aparezcan, cada uno se ve siempre
// con el mismo color en toda la pantalla.
// ============================================================
const PALETA_COMPONENTES = [
  { dot: "bg-indigo-500", texto: "text-indigo-700", fondo: "bg-indigo-50", borde: "border-indigo-200" },
  { dot: "bg-fuchsia-500", texto: "text-fuchsia-700", fondo: "bg-fuchsia-50", borde: "border-fuchsia-200" },
  { dot: "bg-cyan-500", texto: "text-cyan-700", fondo: "bg-cyan-50", borde: "border-cyan-200" },
  { dot: "bg-orange-500", texto: "text-orange-700", fondo: "bg-orange-50", borde: "border-orange-200" },
  { dot: "bg-teal-500", texto: "text-teal-700", fondo: "bg-teal-50", borde: "border-teal-200" },
  { dot: "bg-pink-500", texto: "text-pink-700", fondo: "bg-pink-50", borde: "border-pink-200" },
  { dot: "bg-lime-600", texto: "text-lime-700", fondo: "bg-lime-50", borde: "border-lime-200" },
  { dot: "bg-violet-500", texto: "text-violet-700", fondo: "bg-violet-50", borde: "border-violet-200" },
] as const;

function hashTextoSimple(texto: string): number {
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 31 + texto.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Fuente única de verdad para el nombre del componente: si el backend
// no envía nada (null, undefined o string vacío), cae en "General" sin
// romper la agrupación ni la asignación de color.
function nombreComponente(item: Pick<DetallePregunta, "componente">): string {
  const valor = item.componente?.trim();
  return valor && valor.length > 0 ? valor : "General";
}

function colorDeComponente(nombre: string) {
  const indice = hashTextoSimple(nombre) % PALETA_COMPONENTES.length;
  return PALETA_COMPONENTES[indice];
}

// Agrupa las preguntas en bloques CONTIGUOS según su componente, tal
// como vienen ordenadas desde el backend (respeta el orden real del
// examen). Si el mismo componente aparece en dos tramos separados del
// examen, se generan dos grupos distintos — eso es correcto: cada uno
// mostrará su propio rango de preguntas.
interface GrupoComponente {
  nombre: string;
  preguntas: DetallePregunta[];
  numeroInicio: number;
  numeroFin: number;
  correctas: number;
}

function agruparPreguntasPorComponente(preguntas: DetallePregunta[]): GrupoComponente[] {
  const grupos: GrupoComponente[] = [];

  preguntas.forEach((p, index) => {
    const nombre = nombreComponente(p);
    const numero = p.numero_pregunta ?? index + 1;
    const ultimoGrupo = grupos[grupos.length - 1];

    if (ultimoGrupo && ultimoGrupo.nombre === nombre) {
      ultimoGrupo.preguntas.push(p);
      ultimoGrupo.numeroFin = numero;
      if (p.es_correcta) ultimoGrupo.correctas++;
    } else {
      grupos.push({
        nombre,
        preguntas: [p],
        numeroInicio: numero,
        numeroFin: numero,
        correctas: p.es_correcta ? 1 : 0,
      });
    }
  });

  return grupos;
}
// ============================================================
// COMPONENTE: RADAR DE DOMINIO (SVG puro, sin librerías externas)
// ============================================================
const RadarDominio = React.memo(function RadarDominio({ data }: { data: AnaliticaData[] }) {
  if (!data || data.length === 0) return null;

  // Un radar necesita mínimo 3 ejes para verse coherente; si hay menos,
  // rellenamos con ejes "fantasma" en 0% (líneas punteadas) sin etiqueta.
  let visualData = data;
  if (data.length === 1) {
    visualData = [...data, { area: "", porcentaje: 0 }, { area: "", porcentaje: 0 }];
  } else if (data.length === 2) {
    visualData = [...data, { area: "", porcentaje: 0 }];
  }

  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 50;
  const niveles = 4;
  const angleStep = (Math.PI * 2) / visualData.length;

  const puntoEn = (indice: number, valorPorcentaje: number) => {
    const angulo = angleStep * indice - Math.PI / 2;
    const r = (Math.min(Math.max(valorPorcentaje, 0), 100) / 100) * radius;
    return {
      x: center + r * Math.cos(angulo),
      y: center + r * Math.sin(angulo),
    };
  };

  const puntosPoligono = visualData
    .map((d, i) => {
      const p = puntoEn(i, d.porcentaje ?? 0);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center justify-center w-full overflow-visible">
      <svg
        width="100%"
        height="auto"
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible max-w-[320px]"
      >
        {/* Anillos de fondo (niveles de referencia) */}
        {Array.from({ length: niveles }).map((_, nivel) => {
          const r = (radius / niveles) * (nivel + 1);
          const puntosAnillo = visualData
            .map((_, i) => {
              const angulo = angleStep * i - Math.PI / 2;
              return `${center + r * Math.cos(angulo)},${center + r * Math.sin(angulo)}`;
            })
            .join(" ");
          return <polygon key={nivel} points={puntosAnillo} fill="none" stroke="#e2e8f0" strokeWidth={1} />;
        })}

        {/* Ejes radiales */}
        {visualData.map((_, i) => {
          const p = puntoEn(i, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="#e2e8f0"
              strokeWidth={1}
              strokeDasharray={visualData[i].area === "" ? "4 4" : "0"}
            />
          );
        })}

        {/* Polígono de dominio real */}
        <polygon
          points={puntosPoligono}
          fill="rgba(37, 99, 235, 0.2)"
          stroke="#2563eb"
          strokeWidth={3}
          strokeLinejoin="round"
        />

        {/* Etiquetas de cada eje */}
        {visualData.map((d, i) => {
          if (d.area === "") return null;
          const p = puntoEn(i, 115);
          return (
            <g key={i}>
              <text x={p.x} y={p.y} textAnchor="middle" className="fill-slate-600 font-bold" fontSize={10}>
                {d.area.length > 20 ? d.area.substring(0, 18) + "..." : d.area}
              </text>
              <text x={p.x} y={p.y + 12} textAnchor="middle" className="fill-blue-600 font-black" fontSize={11}>
                {Math.round(d.porcentaje ?? 0)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

// ============================================================
// COMPONENTE: MAPA DE PREGUNTAS (panorama tipo píldoras)
// ============================================================
function MapaDePreguntas({
  preguntas,
  preguntaResaltada,
  onSeleccionar,
}: {
  preguntas: DetallePregunta[];
  preguntaResaltada: string | null;
  onSeleccionar: (preguntaId: string) => void;
}) {
  const conteo = useMemo(() => {
    let correctas = 0;
    let incorrectas = 0;
    let omitidas = 0;
    preguntas.forEach((p) => {
      const estado = estadoDePregunta(p);
      if (estado === "correcta") correctas++;
      else if (estado === "incorrecta") incorrectas++;
      else omitidas++;
    });
    return { correctas, incorrectas, omitidas };
  }, [preguntas]);

  // Bloques contiguos por componente pedagógico, calculados una sola vez
  // por render de la lista completa de preguntas.
  const grupos = useMemo(() => agruparPreguntasPorComponente(preguntas), [preguntas]);

  return (
    <div className="flex flex-col space-y-5">
      {/* Resumen numérico */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-2.5">
          <p className="text-lg font-black text-emerald-600">{conteo.correctas}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Correctas</p>
        </div>
        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-2.5">
          <p className="text-lg font-black text-rose-600">{conteo.incorrectas}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Incorrectas</p>
        </div>
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-2.5">
          <p className="text-lg font-black text-amber-700">{conteo.omitidas}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Omitidas</p>
        </div>
      </div>

      {/* Bloques agrupados por componente pedagógico: cada uno con su
          color distintivo, el rango exacto de preguntas que cubre
          (ej. "Preguntas 1–15") y sus propias píldoras numeradas. */}
      <div className="max-h-[45vh] lg:max-h-[55vh] overflow-y-auto pr-1 pb-1 custom-scrollbar space-y-4">
        {grupos.map((grupo, grupoIdx) => {
          const color = colorDeComponente(grupo.nombre);
          const rango =
            grupo.numeroInicio === grupo.numeroFin
              ? `Pregunta ${grupo.numeroInicio}`
              : `Preguntas ${grupo.numeroInicio}–${grupo.numeroFin}`;

          return (
            <div
              key={`${grupo.nombre}-${grupoIdx}`}
              className={`rounded-2xl border ${color.borde} ${color.fondo} p-3`}
            >
              {/* Encabezado del grupo: nombre + rango */}
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                  <span className={`truncate text-[11px] font-black uppercase tracking-wide ${color.texto}`}>
                    {grupo.nombre}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-bold ${color.texto}`}
                >
                  {rango}
                </span>
              </div>

              {/* Píldoras numeradas del grupo: clic para saltar directo */}
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-5 gap-2.5">
                {grupo.preguntas.map((p, index) => {
                  const estado = estadoDePregunta(p);
                  const resaltada = preguntaResaltada === p.pregunta_id;
                  return (
                    <button
                      key={p.pregunta_id}
                      type="button"
                      onClick={() => onSeleccionar(p.pregunta_id)}
                      title={`Ir a la pregunta ${p.numero_pregunta ?? index + 1} · ${grupo.nombre}`}
                      className={`h-11 w-full rounded-xl flex items-center justify-center text-sm transition-all duration-200 ${clasePildoraResultado(
                        estado,
                        resaltada
                      )}`}
                    >
                      {p.numero_pregunta ?? index + 1}
                    </button>
                  );
                })}
              </div>

              {/* Aciertos del bloque, para contexto rápido */}
              <p className={`mt-2 text-right text-[9px] font-bold ${color.texto}`}>
                {grupo.correctas}/{grupo.preguntas.length} correctas
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ResultadoDetallePage() {
  const params = useParams();
  const router = useRouter();

  const id = useMemo(() => {
    const raw = params?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resumen, setResumen] = useState<ResumenResultado | null>(null);
  const [preguntas, setPreguntas] = useState<DetallePregunta[]>([]);

  const [stats, setStats] = useState<AnaliticaFullResponse | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [intentoAnalitica, setIntentoAnalitica] = useState(0);

  const [filtroEstado, setFiltroEstado] = useState<"todas" | "correctas" | "incorrectas" | "omitidas">("todas");
  const [filtroComponente, setFiltroComponente] = useState<string>("TODOS");
  const [textosExpandidos, setTextosExpandidos] = useState<{ [key: string]: boolean }>({});
  const [modoLectura, setModoLectura] = useState(false);

  // Paginación: 10 preguntas por página para no saturar la pantalla.
  const [pagina, setPagina] = useState(1);
  const listaRef = useRef<HTMLDivElement>(null);

  // Mapa de preguntas: bottom sheet en móvil + pregunta resaltada tras un salto
  const [mostrarMapaMovil, setMostrarMapaMovil] = useState(false);
  const [preguntaResaltada, setPreguntaResaltada] = useState<string | null>(null);

  const {
    soportado: vozSoportada,
    alternar: alternarLectura,
    detener: detenerLectura,
    estadoDe: estadoAudioDe,
  } = useLecturaVoz();

  // ============================================================
  // CARGAR DATOS DE LA API (con guard contra actualizar estado tras desmontar)
  // ============================================================

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    async function cargarResultado() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchAPI<ResultadosApiResponse>(`/intentos/${id}/resultados`);
        if (cancelado) return;

        const rawPreguntas: DetallePregunta[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.preguntas)
          ? response.preguntas
          : [];

        const rawResumen: ResumenResultado | null = Array.isArray(response)
          ? null
          : (response?.resumen as ResumenResultado | undefined) ??
            ((response as unknown as ResumenResultado) || null);

        setPreguntas(rawPreguntas);
        setResumen(rawResumen);
      } catch (err) {
        if (cancelado) return;
        console.error("Error cargando detalle:", err);
        setError("No se pudo cargar el detalle del examen. Intenta de nuevo.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    cargarResultado();
    return () => {
      cancelado = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelado = false;

    async function cargarAnalitica() {
      try {
        setStatsError(false);
        const dataCruda = await fetchAPI<AnaliticaApiCruda>(`/analitica/intento/${id}`);
        if (cancelado) return;
        setStats(normalizarAnalitica(dataCruda));
      } catch (err) {
        if (cancelado) return;
        console.error("Error cargando analítica:", err);
        setStatsError(true);
      }
    }

    cargarAnalitica();
    return () => {
      cancelado = true;
    };
  }, [id, intentoAnalitica]);

  // Si cambia el filtro o el modo lectura, cortamos cualquier lectura en
  // curso y volvemos a la página 1 (el set de preguntas visible cambió).
  useEffect(() => {
    detenerLectura();
    setPagina(1);
  }, [modoLectura, filtroEstado, filtroComponente, detenerLectura]);

  // Al saltar desde el Mapa de Preguntas, calculamos en qué página cae la
  // pregunta objetivo sobre la lista completa (el salto resetea los
  // filtros a "todas"/"TODOS"). Corre después del efecto anterior, así
  // que este setPagina(...) tiene la última palabra sobre la página final.
  useEffect(() => {
    if (!preguntaResaltada) return;
    const indice = preguntas.findIndex((p) => p.pregunta_id === preguntaResaltada);
    if (indice === -1) return;
    const paginaObjetivo = Math.floor(indice / PREGUNTAS_POR_PAGINA) + 1;
    setPagina(paginaObjetivo);
  }, [preguntaResaltada, preguntas]);

  // Una vez la página correcta está renderizada, hacemos scroll hasta la
  // tarjeta de la pregunta y quitamos el resaltado pasado un momento.
  useEffect(() => {
    if (!preguntaResaltada) return;

    const timeoutScroll = setTimeout(() => {
      const el = document.getElementById(`pregunta-${preguntaResaltada}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);

    const timeoutLimpieza = setTimeout(() => setPreguntaResaltada(null), 2500);

    return () => {
      clearTimeout(timeoutScroll);
      clearTimeout(timeoutLimpieza);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaResaltada, pagina]);

  // Bloquea el scroll del body mientras la hoja del Mapa está abierta en móvil
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mostrarMapaMovil ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mostrarMapaMovil]);

  const toggleTextoBase = useCallback((preguntaId: string) => {
    setTextosExpandidos((prev) => ({ ...prev, [preguntaId]: !prev[preguntaId] }));
  }, []);

  const irAPreguntaDesdeMapa = useCallback((preguntaId: string) => {
    // Reseteamos filtros para garantizar que la pregunta objetivo esté
    // visible sin importar qué filtro tuviera activo el usuario.
    setFiltroEstado("todas");
    setFiltroComponente("TODOS");
    setPreguntaResaltada(preguntaId);
    setMostrarMapaMovil(false);
  }, []);

  // Lista de componentes pedagógicos únicos presentes en el intento, para
  // armar los chips de filtro (solo se muestran si hay al menos uno).
  const componentesDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          preguntas
            .map((p) => p.componente)
            .filter((c): c is string => Boolean(c && c.trim().length > 0))
        )
      ),
    [preguntas]
  );

  const preguntasFiltradas = useMemo(
    () =>
      preguntas.filter((item) => {
        let pasaEstado = true;
        if (filtroEstado === "correctas") pasaEstado = item.es_correcta;
        else if (filtroEstado === "incorrectas")
          pasaEstado = !item.es_correcta && Boolean(item.opcion_seleccionada_id);
        else if (filtroEstado === "omitidas") pasaEstado = !item.opcion_seleccionada_id;

        const pasaComponente = filtroComponente === "TODOS" || item.componente === filtroComponente;

        return pasaEstado && pasaComponente;
      }),
    [preguntas, filtroEstado, filtroComponente]
  );

  // Paginación derivada de la lista ya filtrada
  const totalPaginas = Math.max(1, Math.ceil(preguntasFiltradas.length / PREGUNTAS_POR_PAGINA));
  const paginaSegura = Math.min(Math.max(pagina, 1), totalPaginas);

  const preguntasPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * PREGUNTAS_POR_PAGINA;
    return preguntasFiltradas.slice(inicio, inicio + PREGUNTAS_POR_PAGINA);
  }, [preguntasFiltradas, paginaSegura]);

  const irAPagina = useCallback((nueva: number) => {
    setPagina(nueva);
    listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Si hay al menos 3 subpruebas usamos esas para el radar; si no, caemos a
  // componentes pedagógicos (más granulares) cuando hay suficientes.
  const usaComponentesParaRadar = useMemo(() => {
    const tieneSuficientesSubpruebas = (stats?.subpruebas?.length || 0) >= 3;
    const tieneSuficientesComponentes = (stats?.componentes?.length || 0) >= 3;
    return !tieneSuficientesSubpruebas && tieneSuficientesComponentes;
  }, [stats]);

  const radarData = useMemo(() => {
    if (!stats) return [];

    if (stats.subpruebas && stats.subpruebas.length >= 3) {
      return stats.subpruebas.map((s) => ({ area: s.area, porcentaje: s.porcentaje ?? 0 }));
    }

    if (stats.componentes && stats.componentes.length >= 3) {
      return stats.componentes.map((c) => ({ area: c.componente, porcentaje: c.porcentaje ?? 0 }));
    }

    return (stats.subpruebas || []).map((s) => ({ area: s.area, porcentaje: s.porcentaje ?? 0 }));
  }, [stats]);

  // Aciertos totales / total de preguntas, para el badge tipo "✓ 2/75" de cada tarjeta
  const totalAciertos = resumen?.preguntas_correctas ?? preguntas.filter((p) => p.es_correcta).length;
  const totalGeneral = resumen?.total_preguntas ?? preguntas.length;

  // ============================================================
  // ESTADOS DE CARGA / ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="font-medium text-slate-600">Cargando el desglose de tu examen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
          <h2 className="text-xl font-bold text-slate-800">Error de conexión</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => router.push("/resultados")}
            className="mt-6 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800"
          >
            Volver a Mis Resultados
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Animaciones locales del lector de voz (ecualizador + halo) */}
      <style>{`
        .ds-eq {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          height: 18px;
          width: 18px;
        }
        .ds-eq > span {
          width: 3px;
          height: 70%;
          border-radius: 9999px;
          background: currentColor;
          transform-origin: center;
          animation: ds-eq-onda 900ms ease-in-out infinite;
        }
        .ds-eq > span:nth-child(2) { height: 100%; animation-delay: 150ms; }
        .ds-eq > span:nth-child(3) { animation-delay: 300ms; }
        @keyframes ds-eq-onda {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1); }
        }
        .ds-halo::before {
          content: "";
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          border: 2px solid rgb(37 99 235 / 0.45);
          animation: ds-halo-pulso 1800ms ease-out infinite;
        }
        @keyframes ds-halo-pulso {
          0%   { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ds-eq > span { animation: none; transform: scaleY(0.7); }
          .ds-halo::before { animation: none; opacity: 0.5; }
        }
      `}</style>

      {/* ============================================================
          CABECERA STICKY
      ============================================================ */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 p-3 sm:p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4">
          <Link
            href="/resultados"
            className="flex shrink-0 items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeft size={16} />
            <span className="hidden xs:inline">Volver</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Botón móvil para abrir el Mapa de Preguntas como hoja inferior */}
            <button
              onClick={() => setMostrarMapaMovil(true)}
              className="lg:hidden flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
              title="Mapa de preguntas"
            >
              <LayoutGrid size={16} />
              <span className="hidden xs:inline">Mapa</span>
            </button>
{/*
            <Link
              href={`/resultados/${id}/analitica`}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-blue-900 px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-black text-white shadow-lg shadow-blue-100 transition-transform hover:bg-blue-800 active:scale-95"
            >
              <BarChart3 size={16} className="text-cyan-400" />
              <span className="hidden xs:inline">DIAGNÓSTICO PRO</span>
              <span className="xs:hidden">PRO</span>
            </Link> */}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Revisión de Examen</h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500">
            Revisa todas las alternativas (A, B, C, D) junto con el sustento pedagógico de cada pregunta.
          </p>
        </header>

        {/* ============================================================
            TARJETAS DE RESUMEN
        ============================================================ */}
        {resumen && (
          <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Award size={16} className="text-blue-600 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Puntaje</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-slate-800">
                {resumen.puntaje ?? 0}{" "}
                <span className="text-xs font-normal text-slate-400">/ {resumen.puntaje_maximo ?? 100}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Target size={16} className="text-emerald-600 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Aciertos</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-600">
                {resumen.preguntas_correctas ?? 0}{" "}
                <span className="text-xs font-normal text-slate-400">
                  / {resumen.total_preguntas ?? preguntas.length}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <XCircle size={16} className="text-rose-500 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Incorrectas</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-rose-600">
                {resumen.preguntas_incorrectas ?? 0}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={16} className="text-amber-500 shrink-0" />
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Tiempo</span>
              </div>
              <p className="mt-2 text-xl sm:text-2xl font-black text-slate-800">
                {formatTiempo(resumen.tiempo_empleado_segundos)}
              </p>
            </div>
          </div>
        )}

        {/* ============================================================
            ANALÍTICA: RADAR DE DOMINIO + DIAGNÓSTICO SMART
        ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-base sm:text-lg font-bold mb-2">Dominio de Capacidades</h2>

            {stats && (
              <p className="text-[10px] text-blue-600 mb-4 uppercase font-bold tracking-widest animate-in fade-in duration-500">
                {usaComponentesParaRadar ? "Análisis por Componentes Temáticos" : "Equilibrio por Subpruebas Generales"}
              </p>
            )}

            {statsError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
                <AlertCircle size={28} className="text-rose-400" />
                <p className="text-sm">No se pudo cargar la analítica.</p>
                <button
                  onClick={() => setIntentoAnalitica((n) => n + 1)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                >
                  Reintentar
                </button>
              </div>
            ) : !stats ? (
              <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <p>Generando analítica avanzada...</p>
              </div>
            ) : radarData.length > 0 ? (
              <div className="flex min-h-[260px] sm:min-h-[320px] items-center justify-center">
                <RadarDominio data={radarData} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                <p className="text-sm italic">No hay datos suficientes para el mapa de calor.</p>
              </div>
            )}
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-base sm:text-lg font-bold mb-4">Diagnóstico Smart</h2>
            {stats?.componentes && stats.componentes.length > 0 ? (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {stats.componentes.map((c) => (
                  <div
                    key={c.componente}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-700">{c.componente}</p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        {c.aciertos} de {c.total} aciertos
                      </p>
                    </div>
                    <div
                      className={`text-sm font-black ${
                        (c.porcentaje ?? 0) < 50 ? "text-red-500" : "text-emerald-500"
                      }`}
                    >
                      {Math.round(c.porcentaje ?? 0)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-10">Aún no hay datos suficientes para el diagnóstico.</p>
            )}

            {/* {stats?.recomendacion && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs leading-relaxed text-blue-800">
                <span className="font-black uppercase tracking-wide">Recomendación: </span>
                {stats.recomendacion}
              </div>
            )} */}
          </div>
        </div>

        {/* ============================================================
            LAYOUT PRINCIPAL: lista de preguntas + sidebar del Mapa
        ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-8 xl:col-span-9">
            {/* CONTROLES: filtro por estado + modo lectura */}
            <div
              ref={listaRef}
              className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4 scroll-mt-24"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={16} className="text-slate-400 shrink-0" />
                {(["todas", "correctas", "incorrectas", "omitidas"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltroEstado(f)}
                    aria-pressed={filtroEstado === f}
                    className={`rounded-xl px-3 py-1.5 text-[11px] sm:text-xs font-bold capitalize transition-all ${
                      filtroEstado === f
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setModoLectura(!modoLectura)}
                aria-pressed={modoLectura}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all ${
                  modoLectura
                    ? "bg-slate-800 text-white shadow-md border-transparent"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {modoLectura ? <EyeOff size={16} /> : <Eye size={16} />}
                <span className="hidden xs:inline">
                  {modoLectura ? "MOSTRAR TEXTOS BASE" : "MODO LECTURA (OCULTAR TEXTOS BASE)"}
                </span>
                <span className="xs:hidden">{modoLectura ? "MOSTRAR" : "MODO LECTURA"}</span>
              </button>
            </div>

            {/* CHIPS DE FILTRO POR COMPONENTE PEDAGÓGICO */}
            {componentesDisponibles.length > 0 && (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setFiltroComponente("TODOS")}
                  aria-pressed={filtroComponente === "TODOS"}
                  className={`shrink-0 rounded-full px-4 py-2 text-[11px] sm:text-xs font-bold transition-all ${
                    filtroComponente === "TODOS"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Todos los componentes
                </button>
                {componentesDisponibles.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFiltroComponente(c)}
                    aria-pressed={filtroComponente === c}
                    className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[11px] sm:text-xs font-bold transition-all ${
                      filtroComponente === c
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Contador de resultados + página actual, útil cuando hay varias páginas */}
            {preguntasFiltradas.length > 0 && (
              <p className="mb-4 text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-400">
                {preguntasFiltradas.length} pregunta{preguntasFiltradas.length !== 1 ? "s" : ""}
                {totalPaginas > 1 && ` · Página ${paginaSegura} de ${totalPaginas}`}
              </p>
            )}

            {/* ============================================================
                LISTA DE PREGUNTAS
            ============================================================ */}
            {preguntasFiltradas.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 text-center shadow-sm">
                <Info size={40} className="mx-auto mb-4 text-slate-400" />
                <h2 className="text-lg sm:text-xl font-black text-slate-800">Sin coincidencias</h2>
                <p className="mt-2 text-sm text-slate-500">
                  No encontramos preguntas asociadas al filtro seleccionado.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:gap-8">
                  {preguntasPagina.map((item) => {
                    const estaExpandidoTexto = textosExpandidos[item.pregunta_id] ?? true;
                    const explicacionTexto = item.explicacion || item.sustento;
                    const tieneTextoBase = Boolean(item.texto_base_contenido);
                    const mostrarTextoBase = !modoLectura && tieneTextoBase;
                    const estadoAudio = estadoAudioDe(item.pregunta_id);
                    const idSustento = `sustento-${item.pregunta_id}`;
                    const estadoAudioSustento = estadoAudioDe(idSustento);
                    const estaResaltada = preguntaResaltada === item.pregunta_id;

                    // NORMALIZACIÓN ROBUSTA: extrae A, B, C, D completas sin
                    // importar bajo qué nombre/formato las envió el backend.
                    const opciones = normalizarOpcionesPregunta(item);
                    const opcionCorrecta = opciones.find((o) => o.es_correcta);
                    const opcionMarcada = opciones.find(
                      (o) => String(o.id) === String(item.opcion_seleccionada_id)
                    );
                    const textoParaLeer = construirTextoLectura(
                      item,
                      opciones,
                      mostrarTextoBase && estaExpandidoTexto
                    );
                    const textoSustento = `Sustento pedagógico. ${
                      explicacionTexto ||
                      "El sustento pedagógico detallado para esta pregunta estará disponible pronto."
                    }`;
                    const nombreComp = nombreComponente(item);
                    const colorComp = colorDeComponente(nombreComp);

                    return (
                      <article
                        key={item.pregunta_id}
                        id={`pregunta-${item.pregunta_id}`}
                        className={`overflow-hidden rounded-2xl sm:rounded-3xl border-2 bg-white shadow-sm transition-all scroll-mt-24 ${
                          item.es_correcta ? "border-emerald-100" : "border-rose-100"
                        } ${estaResaltada ? "ring-4 ring-blue-500/50" : ""} ${
                          estadoAudio !== "inactivo" || estadoAudioSustento !== "inactivo"
                            ? "ring-2 ring-blue-400/40"
                            : ""
                        }`}
                      >
                        {/* HEADER: "Pregunta N de Total" + contador global de aciertos */}
                        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-100">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] sm:text-xs font-black text-blue-700 border border-blue-100">
                            Pregunta {item.numero_pregunta} de {totalGeneral}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] sm:text-xs font-black text-emerald-600 border border-emerald-100">
                            <CheckCircle2 size={12} />
                            {totalAciertos}/{totalGeneral}
                          </span>
                        </div>

                        {/* Franja de estado: qué marcó vs. cuál era la correcta */}
                        <div
                          className={`flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 text-[11px] sm:text-xs font-bold ${
                            item.es_correcta ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${colorComp.fondo} ${colorComp.texto} ${colorComp.borde}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${colorComp.dot}`} />
                          {nombreComp}
                        </span>

                          <div className="flex items-center gap-2">
                            {item.es_correcta ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 size={14} /> ¡Respuesta Correcta! (Alternativa{" "}
                                {opcionCorrecta?.etiqueta ?? "—"})
                              </span>
                            ) : opcionMarcada ? (
                              <span className="flex items-center gap-1">
                                <XCircle size={14} />
                                Marcaste {opcionMarcada.etiqueta} · La correcta era{" "}
                                {opcionCorrecta?.etiqueta ?? "—"}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <AlertCircle size={14} />
                                Sin responder · La correcta era {opcionCorrecta?.etiqueta ?? "—"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4 sm:p-6 md:p-8">
                          {/* TEXTO BASE DE CONSULTA (colapsable) */}
                          {mostrarTextoBase && (
                            <div className="mb-5 sm:mb-6 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/40 shadow-inner">
                              <button
                                type="button"
                                onClick={() => toggleTextoBase(item.pregunta_id)}
                                aria-expanded={estaExpandidoTexto}
                                className="flex w-full items-center justify-between gap-2 p-4 text-left text-[11px] sm:text-xs font-black uppercase tracking-wider text-blue-800 hover:bg-blue-50"
                              >
                                <span className="flex items-center gap-2">
                                  <BookOpen size={14} /> Caso / Texto Base de Consulta
                                </span>
                                {estaExpandidoTexto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>

                              {estaExpandidoTexto && (
                                <div className="border-t border-blue-100 p-4 sm:p-5 text-sm leading-relaxed text-slate-700">
                                  <QuestionText text={item.texto_base_contenido!} className="leading-relaxed" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* ENUNCIADO + botón de audio (escuchar / pausar / reanudar) */}
                          <div className="mb-6 flex items-start justify-between gap-3">
                            <div className="text-base sm:text-lg font-bold leading-relaxed text-slate-900">
                              <QuestionText text={item.enunciado} className="leading-snug" />
                            </div>

                            <BotonEscuchar
                              estado={estadoAudio}
                              onAlternar={() => alternarLectura(item.pregunta_id, textoParaLeer)}
                              onDetener={detenerLectura}
                              disabled={!vozSoportada}
                            />
                          </div>

                          {/* TODAS LAS ALTERNATIVAS (A, B, C, D...), normalizadas
                              y siempre completas — nunca se pierde una opción. */}
                          <div className="mb-6 sm:mb-8 grid gap-3">
                            {opciones.length > 0 ? (
                              opciones.map((op) => {
                                const esLaQueMarco = String(op.id) === String(item.opcion_seleccionada_id);
                                const esLaCorrecta = Boolean(op.es_correcta);
                                const estilos = obtenerEstilosOpcion(esLaCorrecta, esLaQueMarco);

                                return (
                                  <div
                                    key={op.id}
                                    className={`flex items-start gap-3 sm:gap-4 rounded-2xl border-2 p-3.5 sm:p-4 transition-all duration-300 ${estilos.card}`}
                                  >
                                    {/* Círculo con la letra (A, B, C, D...) */}
                                    <span
                                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${estilos.badge}`}
                                    >
                                      {op.etiqueta}
                                    </span>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                                        <span
                                          className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider ${estilos.etiquetaTexto}`}
                                        >
                                          Opción {op.etiqueta}
                                        </span>

                                        {estilos.pillTexto && (
                                          <span
                                            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${estilos.pill}`}
                                          >
                                            {estilos.pillTexto}
                                          </span>
                                        )}
                                      </div>

                                      <div
                                        className={`text-sm sm:text-base leading-relaxed ${
                                          esLaCorrecta || esLaQueMarco ? "font-semibold text-slate-900" : "text-slate-500"
                                        }`}
                                      >
                                        <InlineText text={op.texto_opcion} />
                                      </div>
                                    </div>

                                    {/* Iconos de estado a la derecha */}
                                    {esLaCorrecta && (
                                      <CheckCircle2 size={22} className="shrink-0 text-emerald-600 mt-0.5" />
                                    )}
                                    {esLaQueMarco && !esLaCorrecta && (
                                      <XCircle size={22} className="shrink-0 text-rose-600 mt-0.5" />
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-sm">
                                Las opciones no están disponibles para esta pregunta.
                              </div>
                            )}
                          </div>

                          {/* SUSTENTO PEDAGÓGICO, visualmente destacado */}
                          <div className="relative rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6 shadow-sm overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 pointer-events-none">
                              <Lightbulb size={100} className="text-amber-500" />
                            </div>

                            <div className="relative z-10">
                              <div className="mb-2 flex items-center justify-between gap-2 text-amber-800">
                                <div className="flex items-center gap-2">
                                  <Lightbulb size={18} className="fill-amber-500 text-amber-500" />
                                  <h4 className="text-[11px] sm:text-xs font-black uppercase tracking-widest">
                                    Sustento Pedagógico
                                  </h4>
                                </div>

                                {/* Audio propio del sustento: mismo lector, otro id,
                                    con play / pausa / reanudar en el mismo botón. */}
                                <button
                                  type="button"
                                  onClick={() => alternarLectura(idSustento, textoSustento)}
                                  disabled={!vozSoportada}
                                  aria-label={
                                    estadoAudioSustento === "reproduciendo"
                                      ? "Pausar el sustento"
                                      : estadoAudioSustento === "pausado"
                                      ? "Reanudar el sustento"
                                      : "Escuchar el sustento"
                                  }
                                  title={
                                    estadoAudioSustento === "reproduciendo"
                                      ? "Pausar el sustento"
                                      : estadoAudioSustento === "pausado"
                                      ? "Reanudar el sustento"
                                      : "Escuchar el sustento"
                                  }
                                  className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                                    estadoAudioSustento === "reproduciendo"
                                      ? "bg-amber-600 text-white"
                                      : "bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white"
                                  }`}
                                >
                                  {estadoAudioSustento === "reproduciendo" ? (
                                    <>
                                      <span className="transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0">
                                        <Ecualizador />
                                      </span>
                                      <Pause
                                        size={16}
                                        className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                                      />
                                    </>
                                  ) : estadoAudioSustento === "pausado" ? (
                                    <Play size={16} className="ml-0.5" />
                                  ) : (
                                    <Volume2 size={16} />
                                  )}
                                </button>
                              </div>

                              <div className="text-sm sm:text-base font-medium leading-relaxed text-slate-800 whitespace-pre-line">
                                <QuestionText
                                  text={
                                    explicacionTexto ||
                                    "El sustento pedagógico detallado para esta pregunta estará disponible pronto."
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

            {/* ============================================================
                PAGINADOR
            ================================================================= */}
            {totalPaginas > 1 && (
              <nav
                aria-label="Paginación de preguntas"
                className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6"
              >
                {/* Contador de resultados */}
                <p className="order-2 text-xs font-bold text-slate-400 sm:order-1">
                  Mostrando {(paginaSegura - 1) * PREGUNTAS_POR_PAGINA + 1}–
                  {Math.min(paginaSegura * PREGUNTAS_POR_PAGINA, preguntasFiltradas.length)} de{" "}
                  {preguntasFiltradas.length}
                </p>

                {/* Controles: Anterior · mapa de páginas · Siguiente */}
                <div className="order-1 flex w-full items-center justify-center gap-1.5 sm:order-2 sm:w-auto">
                  {/* Anterior */}
                  <button
                    onClick={() => irAPagina(paginaSegura - 1)}
                    disabled={paginaSegura === 1}
                    aria-label="Página anterior"
                    className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    <span className="hidden sm:inline">Anterior</span>
                  </button>

                  {/* Mapa de páginas — scrollable en pantallas muy angostas */}
                  <div className="flex max-w-[60vw] items-center gap-1 overflow-x-auto scrollbar-none sm:max-w-none">
                    {getRangoPaginas(paginaSegura, totalPaginas).map(
                      (item: number | "dots", idx: number) =>
                        item === "dots" ? (
                          <span
                            key={`dots-${idx}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold text-slate-300"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => irAPagina(item)}
                            aria-current={item === paginaSegura ? "page" : undefined}
                            aria-label={`Ir a la página ${item}`}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-colors ${
                              item === paginaSegura
                                ? "bg-slate-800 text-white shadow-sm"
                                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {item}
                          </button>

                      )
                    )}
                  </div>

                  {/* Siguiente */}
                  <button
                    onClick={() => irAPagina(paginaSegura + 1)}
                    disabled={paginaSegura === totalPaginas}
                    aria-label="Página siguiente"
                    className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </nav>
            )}
              </>
            )}
          </div>

          {/* ============================================================
              SIDEBAR DESKTOP: MAPA DE PREGUNTAS
          ============================================================ */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2 mb-5">
                <LayoutGrid className="w-5 h-5 text-blue-600" /> Mapa de Preguntas
              </h3>
              <MapaDePreguntas
                preguntas={preguntas}
                preguntaResaltada={preguntaResaltada}
                onSeleccionar={irAPreguntaDesdeMapa}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* ============================================================
          HOJA INFERIOR (BOTTOM SHEET) DEL MAPA DE PREGUNTAS EN MÓVIL
      ============================================================ */}
      {mostrarMapaMovil && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          {/* Overlay: clic afuera cierra la hoja */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMostrarMapaMovil(false)}
          />

          <div className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Manija visual arriba de la hoja */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-blue-600" /> Mapa de Preguntas
              </h3>
              <button
                onClick={() => setMostrarMapaMovil(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                aria-label="Cerrar mapa de preguntas"
              >
                <X size={18} />
              </button>
            </div>

            <MapaDePreguntas
              preguntas={preguntas}
              preguntaResaltada={preguntaResaltada}
              onSeleccionar={irAPreguntaDesdeMapa}
            />
          </div>
        </div>
      )}
    </div>
  );
}