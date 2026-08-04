'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // loginWithToken ahora devuelve Promise<boolean>, así que success es boolean
      loginWithToken(token).then((success: boolean) => {
        if (success) {
          window.location.href = '/examenes';
        } else {
          window.location.href = '/login?error=token_invalid';
        }
      });
    } else {
      window.location.href = '/login?error=no_token';
    }
  }, [searchParams, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Sincronizando con PrimexDoc...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Iniciando...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}