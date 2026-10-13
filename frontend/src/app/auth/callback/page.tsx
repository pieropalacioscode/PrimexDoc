// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ShieldCheck } from 'lucide-react';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithToken } = useAuth();
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const code = searchParams.get('code');

    // Eliminar inmediatamente el código del historial visible.
    window.history.replaceState(null, '', '/auth/callback');

    if (!code) {
      router.replace('/login?error=no_code');
      return;
    }

    const exchange = async () => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          'http://localhost:8080/api/v1';

        const response = await fetch(
          `${baseUrl}/auth/google/exchange`,
          {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          }
        );

        if (!response.ok) {
          throw new Error('No se pudo canjear la sesión OAuth');
        }

        const data: { token?: string } = await response.json();

        if (!data.token) {
          throw new Error('Respuesta OAuth sin sesión');
        }

        const success = await loginWithToken(data.token);

        router.replace(
          success ? '/examenes' : '/login?error=token_invalid'
        );
      } catch {
        router.replace('/login?error=google_auth');
      }
    };

    void exchange();
  }, [searchParams, loginWithToken, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1628]">
      {/* Fondo con resplandor Premium */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative text-center space-y-8 animate-in fade-in duration-1000">
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-xl bg-blue-400/30 rounded-full animate-spin-slow" />
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin relative" strokeWidth={3} />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic italic">
            Primex<span className="text-cyan-400">Doc</span>
          </h2>
          <div className="flex items-center justify-center gap-2 text-blue-200/60 font-bold text-xs uppercase tracking-[0.3em]">
            <ShieldCheck size={14} className="text-cyan-400" />
            Sincronizando Cuenta
          </div>
        </div>

        <p className="text-slate-400 text-sm font-medium max-w-[250px] mx-auto leading-relaxed">
          Preparando tu entorno de evaluación profesional...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}