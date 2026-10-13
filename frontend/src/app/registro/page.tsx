//frontend > src > app > registro > page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchAPI } from '@/services/api';
import {
  Loader2, Lock, Mail, User, ArrowRight,
  ShieldCheck, AlertCircle, CheckCircle2,
  Eye, EyeOff
} from 'lucide-react';

const passwordSchema = z
  .string()
  .min(6, 'Mínimo 6 caracteres')
  .regex(/[A-Z]/, 'Debe tener al menos una mayúscula') // 💡 Robustez: exige mayúscula
  .regex(/[0-9]/, 'Debe tener al menos un número');   // 💡 Robustez: exige número

const registroSchema = z.object({
  nombre_completo: z.string().min(3, 'Ingresa tu nombre completo'),
  correo: z.string().email('Ingresa un correo válido'),
  contrasena: passwordSchema,
  confirmar: z.string()
}).refine((data) => data.contrasena === data.confirmar, {
  message: "Las contraseñas no coinciden",
  path: ["confirmar"],
});

type RegistroFormValues = z.infer<typeof registroSchema>;

export default function RegistroPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- ESTADOS PARA VER/OCULTAR CONTRASEÑA ---
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
  });

  // --- FUNCIÓN DE REGISTRO CON GOOGLE ---
  const handleGoogleLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    // Redirige al endpoint de Go que ya maneja GetOrCreateUser
    window.location.href = `${backendUrl}/auth/google/login`;
  };

  const onSubmit = async (values: RegistroFormValues) => {
    setServerError(null);
    setIsLoading(true);
    try {
      await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          nombre_completo: values.nombre_completo,
          correo: values.correo,
          contrasena: values.contrasena
        }),
      });
      setIsSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      if (err.status === 409) {
        setServerError('Este correo ya está registrado en nuestra plataforma.');
      } else {
        setServerError(err.error || 'Error al procesar el registro.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-[32px] shadow-2xl text-center border border-emerald-100 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900">¡Cuenta Creada!</h2>
          <p className="text-slate-500 mt-4 leading-relaxed">Te hemos registrado con éxito. Serás redirigido al portal de acceso en unos segundos...</p>
          <Loader2 className="animate-spin mx-auto mt-8 text-emerald-500" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">
            Primex<span className="text-blue-600">Doc</span>
          </h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Crea tu cuenta profesional</p>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-slate-200/60 border border-slate-100">

          {/* --- BOTÓN GOOGLE INTEGRADO --- */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-600 font-bold py-3.5 px-4 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all mb-6 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Registrarme con Google
          </button>

          {/* --- DIVISOR VISUAL --- */}
          <div className="relative flex items-center justify-center mb-8">
            <div className="border-t border-slate-100 w-full"></div>
            <span className="bg-white px-4 text-[10px] text-slate-400 uppercase font-black tracking-widest absolute">
              O REGISTRO MANUAL
            </span>
          </div>

          {serverError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-center gap-3 animate-in shake">
              <AlertCircle size={18} className="shrink-0" />
              <p className="font-bold">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  {...register('nombre_completo')}
                  placeholder="Ej. Juan Pérez"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              {errors.nombre_completo && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{errors.nombre_completo.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  {...register('correo')}
                  type="email"
                  placeholder="tu@correo.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>
              {errors.correo && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{errors.correo.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Contraseña</label>
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
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Confirmar Contraseña</label>
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
                    tabIndex={-1}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
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
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Crear mi Cuenta <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-8">
            ¿Ya eres parte de DocenteSmart?{' '}
            <Link href="/login" className="text-blue-600 font-black hover:underline uppercase tracking-tighter">
              Inicia Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}