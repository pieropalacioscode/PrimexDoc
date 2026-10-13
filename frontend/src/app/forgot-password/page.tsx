//frontend > src > app > forgot-password > page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchAPI } from '@/services/api';
import { Loader2, Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, MailCheck } from 'lucide-react';

const forgotSchema = z.object({
  correo: z.string().email('Ingresa un correo institucional válido'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

const REDIRECT_SECONDS = 5;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSent, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [isNavigating, setIsNavigating] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const hasNavigatedRef = useRef(false);

  // --- NAVEGACIÓN AUTOMÁTICA CON RECARGA COMPLETA (evita bugs de Router Cache de Next.js) ---
  // Se usa únicamente para el auto-redirect del temporizador: garantiza que la
  // página de reset-password se monte fresca, sin depender del cache de rutas
  // del App Router (que estaba sirviendo contenido obsoleto).
  const irASiguienteVistaAuto = useCallback(() => {
    if (hasNavigatedRef.current) return;
    if (!sentEmail) {
      setServerError('Ocurrió un problema al procesar tu correo. Intenta nuevamente.');
      setIsSuccess(false);
      return;
    }

    hasNavigatedRef.current = true;
    setIsNavigating(true);
    window.location.href = `/reset-password?email=${encodeURIComponent(sentEmail)}`;
  }, [sentEmail]);

  // --- NAVEGACIÓN MANUAL: clic en "Ya tengo mi código" ---
  // Aquí sí usamos router.push, ya que es instantáneo (SPA) y no necesitamos
  // forzar un montaje limpio: el usuario ya está confirmando la acción.
  const irASiguienteVistaManual = useCallback(() => {
    if (hasNavigatedRef.current) return;
    if (!sentEmail) {
      setServerError('Ocurrió un problema al procesar tu correo. Intenta nuevamente.');
      setIsSuccess(false);
      return;
    }

    hasNavigatedRef.current = true;
    setIsNavigating(true);
    router.push(`/reset-password?email=${encodeURIComponent(sentEmail)}`);
  }, [sentEmail, router]);

  useEffect(() => {
    if (!isSent || hasNavigatedRef.current) return;

    if (secondsLeft <= 0) {
      irASiguienteVistaAuto();
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [isSent, secondsLeft, irASiguienteVistaAuto]);

  const onSubmit = async (values: ForgotFormValues) => {
    setServerError(null);
    setIsLoading(true);
    try {
      await fetchAPI('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      hasNavigatedRef.current = false;
      setSecondsLeft(REDIRECT_SECONDS);
      setSentEmail(values.correo);
      setIsSuccess(true);
    } catch (err: any) {
      setServerError(err.error || 'No pudimos procesar la solicitud. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  const progressPercent = (secondsLeft / REDIRECT_SECONDS) * 100;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        {!isSent && (
          <Link href="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-8 transition-colors">
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
        )}

        <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-slate-200/60 border border-slate-100">
          {isSent ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="relative w-20 h-20 mx-auto mb-6 pointer-events-none">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-50" />
                <div className="relative w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-200 animate-bounce">
                  <MailCheck size={32} />
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-800 tracking-tight">¡Código enviado!</h2>
              <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                Revisa la bandeja de entrada (o spam) de<br />
                <span className="text-blue-600 font-bold">{sentEmail}</span>
              </p>

              {serverError && (
                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-center gap-3 text-left">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="font-bold">{serverError}</p>
                </div>
              )}

              <div className="mt-8 mb-3">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <p className="text-slate-400 text-xs font-bold">
                Te llevaremos a la siguiente pantalla en {secondsLeft}s...
              </p>

              <button
                type="button"
                onClick={irASiguienteVistaManual}
                disabled={isNavigating}
                className="w-full mt-6 bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-xs uppercase tracking-widest"
              >
                {isNavigating ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>Ya tengo mi código <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recuperar Acceso</h2>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                  Ingresa tu correo de docente. Te enviaremos un código de seguridad para restablecer tu clave.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {serverError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-center gap-3">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="font-bold">{serverError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      {...register('correo')}
                      type="email"
                      placeholder="ejemplo@docente.com"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  {errors.correo && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{errors.correo.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Enviar Código <ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}