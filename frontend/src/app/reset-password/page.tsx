//frontend > src > app > reset-password > # page.tsx
'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchAPI } from '@/services/api';
import { Loader2, Lock, ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const passwordSchema = z
  .string()
  .min(6, 'Mínimo 6 caracteres')
  .regex(/[A-Z]/, 'Debe tener al menos una mayúscula') // 💡 Robustez: exige mayúscula
  .regex(/[0-9]/, 'Debe tener al menos un número');   // 💡 Robustez: exige número

const resetSchema = z.object({
  codigo: z.string().length(6, 'El código debe tener 6 dígitos'),
  contrasena: passwordSchema,
  confirmar: z.string()
}).refine(data => data.contrasena === data.confirmar, {
  message: "Las contraseñas no coinciden",
  path: ["confirmar"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (values: ResetFormValues) => {
    setServerError(null);
    setIsLoading(true);
    try {
      await fetchAPI('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          correo: email,
          codigo: values.codigo,
          nueva_contrasena: values.contrasena,
        }),
      });
      setIsSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setServerError(err.error || 'Código incorrecto o expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-slate-100">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nueva Contraseña</h2>
          <p className="text-slate-400 text-sm mt-2">
            Restableciendo acceso para <span className="text-blue-600 font-bold">{email}</span>
          </p>
        </div>

        {isSuccess ? (
          <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-center animate-in zoom-in">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-4" />
            <p className="text-emerald-800 font-bold">¡Contraseña actualizada!</p>
            <p className="text-emerald-600 text-xs">Redirigiendo al login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {serverError && (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-center gap-3">
                <AlertCircle size={18} />
                <p className="font-bold">{serverError}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Código de 6 dígitos</label>
              <input
                {...register('codigo')}
                placeholder="000000"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-center text-2xl font-black tracking-[0.5em] text-slate-700"
                maxLength={6}
              />
              {errors.codigo && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{errors.codigo.message}</p>}
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Nueva Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    {...register('contrasena')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!errors.contrasena && (
                  <p className="text-slate-400 text-[10px] font-medium mt-2 ml-1">
                    Mínimo 6 caracteres, una mayúscula y un número
                  </p>
                )}
                {errors.contrasena && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{errors.contrasena.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    {...register('confirmar')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmar && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{errors.confirmar.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Actualizar Contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<Loader2 className="animate-spin text-blue-600" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}