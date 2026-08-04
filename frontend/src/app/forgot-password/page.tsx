'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { fetchAPI } from '@/services/api';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await fetchAPI('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ correo: correo.toLowerCase().trim() }),
      });
      // Si el backend responde OK, mandamos al usuario a ingresar el código
      router.push(`/reset-password?correo=${encodeURIComponent(correo)}`);
    } catch (err: any) {
      setError('Ocurrió un error. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Recuperar Acceso</h1>
          <p className="text-sm text-slate-500 mt-2">
            Ingresa tu correo y te enviaremos un código de seguridad para restaurar tu clave.
          </p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              placeholder="docente@peru.com"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>
          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md disabled:opacity-50"
          >
            {loading ? 'Enviando código...' : 'Enviar Código de Seguridad'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <Link href="/login" className="text-sm text-slate-500 hover:text-blue-600 font-medium transition">
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}