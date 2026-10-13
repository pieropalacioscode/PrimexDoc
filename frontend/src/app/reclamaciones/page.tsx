// src/app/reclamaciones/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Lightbulb, Bug, Send, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { fetchAPI } from '@/services/api';

type TipoTicket = 'SUGERENCIA' | 'ERROR_CONTENIDO' | 'RECLAMO';

interface FormState {
  nombre: string;
  correo: string;
  dni: string;
  tipo: TipoTicket;
  asunto: string;
  detalle: string;
}

const OPCIONES: {
  id: TipoTicket;
  label: string;
  icon: typeof Lightbulb;
  color: string;
  bg: string;
}[] = [
  { id: 'SUGERENCIA', label: 'Idea / Mejora', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'ERROR_CONTENIDO', label: 'Error en Examen', icon: Bug, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 'RECLAMO', label: 'Libro Reclamos', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const ESTADO_INICIAL: FormState = {
  nombre: '',
  correo: '',
  dni: '',
  tipo: 'SUGERENCIA',
  asunto: '',
  detalle: '',
};

const TIPOS_VALIDOS = OPCIONES.map((o) => o.id);

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  );
}

// useSearchParams necesita un límite <Suspense> alrededor en el App
// Router (si no, Next.js fuerza toda la ruta a render dinámico sin
// avisar). Este wrapper es solo eso: no agrega un archivo nuevo.
export default function ReclamacionesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ReclamacionesForm />
    </Suspense>
  );
}

function ReclamacionesForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Prefill inteligente: si el usuario llegó desde la página 404 (u otra
  // pantalla) con ?tipo=&asunto=&ruta=, arrancamos el formulario ya
  // completado para que no tenga que volver a escribir el problema.
  const [form, setForm] = useState<FormState>(() => {
    const tipoParam = searchParams.get('tipo');
    const tipoInicial = TIPOS_VALIDOS.includes(tipoParam as TipoTicket)
      ? (tipoParam as TipoTicket)
      : ESTADO_INICIAL.tipo;

    const asuntoParam = searchParams.get('asunto');
    const rutaParam = searchParams.get('ruta');

    return {
      ...ESTADO_INICIAL,
      tipo: tipoInicial,
      asunto: asuntoParam?.trim() || ESTADO_INICIAL.asunto,
      detalle: rutaParam
        ? `Encontré un enlace roto o una página no disponible: ${rutaParam}\n\n`
        : ESTADO_INICIAL.detalle,
    };
  });

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Igual que en la página 404: solo mostramos "Volver" si hay
    // historial real dentro de la pestaña, si no mandamos al catálogo.
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.push('/examenes');
    }
  };

  const actualizarCampo = (campo: keyof FormState, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await fetchAPI('/soporte/ticket', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setEnviado(true);
    } catch (err) {
      setError('No pudimos enviar tu solicitud. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl text-center max-w-md">
          <CheckCircle2 size={60} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900">¡Mensaje Recibido!</h2>
          <p className="text-slate-500 mt-2">
            Hemos registrado tu solicitud. Revisaremos la información y te contactaremos de ser necesario.
          </p>
          <button
            onClick={handleBack}
            className="mt-8 inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-600 font-black py-3 px-6 rounded-2xl hover:bg-slate-200 transition-all text-[10px] uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <ArrowLeft size={16} /> {canGoBack ? 'Volver' : 'Ir al Catálogo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <button
        onClick={handleBack}
        className="mb-8 inline-flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
      >
        <ArrowLeft size={16} /> {canGoBack ? 'Volver Atrás' : 'Ir al Catálogo'}
      </button>

      <header className="text-center mb-12">
        <h1 className="text-4xl font-black italic mb-4">
          Centro de <span className="text-blue-600">Atención</span>
        </h1>
        <p className="text-slate-500 font-medium">
          Mejoremos juntos la plataforma DocenteSmart.
        </p>
      </header>

      {/* Selector de tipo de solicitud */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {OPCIONES.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => actualizarCampo('tipo', opt.id)}
            className={`p-6 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-4 ${
              form.tipo === opt.id
                ? 'border-slate-900 bg-white shadow-xl scale-105'
                : 'border-slate-100 bg-slate-50 opacity-60'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${opt.bg} ${opt.color}`}>
              <opt.icon size={24} />
            </div>
            <span className="font-black text-sm uppercase tracking-widest text-slate-800">
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Formulario */}
      <form onSubmit={enviar} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombres</label>
            <input
              type="text"
              placeholder="Nombres completos"
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
              value={form.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
              DNI {form.tipo === 'RECLAMO' ? '(requerido)' : '(solo para reclamos)'}
            </label>
            <input
              type="text"
              placeholder="DNI"
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
              value={form.dni}
              onChange={(e) => actualizarCampo('dni', e.target.value)}
              required={form.tipo === 'RECLAMO'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tu Correo</label>
          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
            value={form.correo}
            onChange={(e) => actualizarCampo('correo', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Asunto</label>
          <input
            type="text"
            placeholder="Ej: Error en Pregunta 5"
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none"
            value={form.asunto}
            onChange={(e) => actualizarCampo('asunto', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Detalles del mensaje</label>
          <textarea
            placeholder={
              form.tipo === 'SUGERENCIA'
                ? '¿Cómo podemos hacer PrimexDoc mejor para ti?'
                : 'Describe el error o el motivo de tu reclamo...'
            }
            className="w-full p-4 bg-slate-50 rounded-2xl outline-none h-40"
            value={form.detalle}
            onChange={(e) => actualizarCampo('detalle', e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-rose-500 text-center font-semibold">{error}</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
          {enviando ? 'Enviando...' : 'Enviar Solicitud'}
        </button>

        {form.tipo === 'RECLAMO' && (
          <p className="text-[10px] text-slate-400 text-center uppercase font-bold tracking-tighter">
            Este formulario cumple con las normas del Libro de Reclamaciones Virtual - Ley 29571
          </p>
        )}
      </form>
    </div>
  );
}