'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/services/api';
import { AuthResponse } from '@/types';
import { toast } from 'sonner';
import SessionLimitModal from '@/components/auth/SessionLimitModal';
import {
  Loader2, Lock, Mail, ArrowRight,
  ShieldCheck, Eye, EyeOff, LogIn
} from 'lucide-react';

const loginSchema = z.object({
  correo: z.string().email('Ingresa un correo válido'),
  contrasena: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const { login, user, token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // 1. INTELIGENCIA DE URL: Captura y Limpieza inmediata
  useEffect(() => {
    const error = searchParams.get('error');
    const expired = searchParams.get('expired');

    if (error === 'session_limit') {
      setShowLimitModal(true);
      // Limpiamos la URL inmediatamente para que si el usuario
      // usa Google o reintenta el login, la URL esté limpia.
      window.history.replaceState({}, '', '/login');
    }

    if (expired === 'true') {
      toast.error('Sesión Expirada', {
        description: 'Vuelve a ingresar para continuar practicando.',
      });
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  // 2. GUARDIA DE REDIRECCIÓN (Evita que un logueado vea el login)
  useEffect(() => {
    if (user && token) {
      router.replace('/examenes');
    }
  }, [user, token, router]);

  const handleCloseLimitModal = () => {
    setShowLimitModal(false);
    // Ya no necesitamos router.replace aquí porque lo hicimos en el useEffect
  };

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);

    try {
      const data = await fetchAPI<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      // Guardamos cookie y estado
      document.cookie = `primex_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
      login(data);

      const nombreUsuario = data.usuario?.nombre_completo
        ? data.usuario.nombre_completo.split(' ')[0]
        : 'Docente';

      toast.success(`¡Hola, ${nombreUsuario}!`, {
        description: "Accediendo a tus simulacros...",
      });

      // Redirección limpia y forzada
      setTimeout(() => {
        window.location.href = '/examenes';
      }, 500);

    } catch (err: any) {
      console.error("Login Error:", err);
      // Si el error al intentar loguearse es que YA hay demasiadas sesiones
      // (caso raro pero posible), mostramos el modal
      if (err.status === 401 && err.error === "LIMITE_SESIONES_ALCANZADO") {
        setShowLimitModal(true);
      } else if (err.status === 401) {
        toast.error('Acceso Denegado', { description: 'El correo o la contraseña son incorrectos.' });
      } else if (err.status === 403) {
        toast.error('Suscripción Vencida', { description: 'Renueva tu plan para seguir practicando.' });
      } else {
        toast.error('Error de Conexión', { description: err.error || 'Intenta de nuevo en unos minutos.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Al hacer clic en Google, la inteligencia de limpieza de URL que pusimos
    // arriba asegura que el flujo sea 100% nuevo.
    toast.info('Conectando con Google...');
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    window.location.href = `${backendUrl}/auth/google/login`;
  };

  return (
    <>
      {showLimitModal && <SessionLimitModal onClose={handleCloseLimitModal} />}

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-4">
            <ShieldCheck size={12} />
            Plataforma Oficial de Preparación
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">
            Primex<span className="text-blue-600">Doc</span>
          </h1>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-slate-200/60 border border-slate-100">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Bienvenido <LogIn size={20} className="text-blue-600" />
            </h2>
            <p className="text-slate-400 text-sm mt-1 font-medium">Ingresa tus credenciales para continuar.</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 text-slate-600 font-black py-3.5 px-4 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition-all mb-6 group text-[10px] uppercase tracking-widest"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="relative flex items-center justify-center mb-8">
            <div className="border-t border-slate-100 w-full"></div>
            <span className="bg-white px-4 text-[10px] text-slate-400 uppercase font-black tracking-widest absolute">
              O USAR MI CUENTA
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.correo ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                <input
                  type="email"
                  {...register('correo')}
                  placeholder="ejemplo@docente.com"
                  className={`w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 outline-none transition-all text-sm font-bold ${
                    errors.correo ? 'border-rose-100 focus:border-rose-500 text-rose-600' : 'border-transparent focus:bg-white focus:border-blue-500 text-slate-700'
                  }`}
                />
              </div>
              {errors.correo && <p className="text-rose-500 text-[10px] font-bold mt-2 ml-1">{errors.correo.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${errors.contrasena ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('contrasena')}
                  placeholder="••••••••"
                  className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-slate-50 border-2 outline-none transition-all text-sm font-bold ${
                    errors.contrasena ? 'border-rose-100 focus:border-rose-500 text-rose-600' : 'border-transparent focus:bg-white focus:border-blue-500 text-slate-700'
                  }`}
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
              <div className="flex justify-end mt-2">
                <Link href="/forgot-password" className="text-[10px] text-blue-600 font-black hover:underline uppercase tracking-tighter">
                  ¿Olvidaste tu clave?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-[10px] uppercase tracking-widest"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Entrar al Portal <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-8 font-medium">
            ¿Nuevo en PrimexDoc?{' '}
            <Link href="/registro" className="text-blue-600 font-black hover:underline uppercase tracking-tighter">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<Loader2 className="animate-spin text-blue-600" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}