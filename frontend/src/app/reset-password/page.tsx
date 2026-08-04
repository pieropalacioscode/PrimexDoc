'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const correoQuery = searchParams.get('correo') || '';

  const [form, setForm] = useState({
    correo: correoQuery,
    codigo: '',
    nueva_contrasena: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await fetchAPI('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      alert("¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.");
      router.push('/login');
    } catch (err: any) {
      setError(err.error || 'El código es incorrecto o ya expiró.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">Confirmando correo para:</label>
        <input type="text" value={form.correo} readOnly className="w-full px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm font-medium outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Código de 6 dígitos</label>
        <input
          type="text"
          required
          maxLength={6}
          placeholder="000000"
          className="w-full px-4 py-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-center text-3xl font-black tracking-[0.5em] text-blue-700 placeholder:text-slate-200"
          value={form.codigo}
          onChange={(e) => setForm({ ...form, codigo: e.target.value.replace(/\D/g, '') })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
        <input
          type="password"
          required
          placeholder="Mínimo 6 caracteres"
          className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          value={form.nueva_contrasena}
          onChange={(e) => setForm({ ...form, nueva_contrasena: e.target.value })}
        />
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">{error}</div>}

      <button
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-lg disabled:opacity-50"
      >
        {loading ? 'Actualizando...' : 'Restaurar Contraseña'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Nueva Contraseña</h1>
        <p className="text-sm text-slate-500 text-center mb-8">Ingresa el código que recibiste y tu nueva clave de acceso.</p>
        
        {/* Suspense es obligatorio en Next.js App Router cuando se usa useSearchParams */}
        <Suspense fallback={<div className="text-center py-10">Cargando formulario...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}