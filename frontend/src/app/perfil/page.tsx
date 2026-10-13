'use client';

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/services/api';
import {
  ShieldCheck,
  AlertCircle,
  Mail,
  User as UserIcon,
  Calendar,
  Loader2,
  LogOut,
  Phone,
  Check,
  X,
  Pencil,
  Send
} from 'lucide-react';
import { Sidebar } from '../(dashboard)/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { resolverNombreDocente } from '@/utils/nombreDocente';
import { normalizarTelefonoWhatsApp, getSmartWhatsAppLink } from '@/utils/whatsapp';

// Interface robusta para el perfil
interface UsuarioPerfil {
  correo?: string;
  rol?: string;
  telefono?: string | null;
  suscripcion_hasta?: string | null;
  dias_restantes?: number;
  [key: string]: any;
}

export default function PerfilPage() {
  const [user, setUser] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const { logout } = useAuth();

  // Estados para gestión inteligente del teléfono
  const [telefonoInput, setTelefonoInput] = useState('');
  const [isEditando, setIsEditando] = useState(false);
  const [isGuardando, setIsGuardando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // 1. Cargar datos del usuario al inicio
  useEffect(() => {
    fetchAPI<UsuarioPerfil>('/me')
      .then((data) => {
        setUser(data);
        setTelefonoInput(data?.telefono || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 2. Cerrar sesión
  const handleLogout = async () => {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error al cerrar sesión', error);
      setCerrandoSesion(false);
    }
  };

  // 3. Guardado con validación inteligente
  const handleGuardarTelefono = async () => {
    setErrorValidacion(null);
    const valorLimpio = telefonoInput.trim();

    if (!valorLimpio) {
      setErrorValidacion('Por favor, ingresa un número.');
      return;
    }

    // Normalización: Si son 9 dígitos, el helper le pone el 51 automáticamente
    const valorNormalizado = normalizarTelefonoWhatsApp(valorLimpio);

    if (!valorNormalizado) {
      setErrorValidacion('Número inválido. Ingresa los 9 dígitos de tu celular.');
      return;
    }

    setIsGuardando(true);
    try {
      await fetchAPI('/me/telefono', {
        method: 'PUT',
        body: JSON.stringify({ telefono: valorNormalizado }),
      });

      // Actualizar estado local para feedback inmediato
      setUser((prev) => (prev ? { ...prev, telefono: valorNormalizado } : prev));
      setTelefonoInput(valorNormalizado);
      setIsEditando(false);
      // Opcional: toast.success("Contacto actualizado")
    } catch (err) {
      console.error('Error al guardar:', err);
      setErrorValidacion('Hubo un problema al guardar. Inténtalo de nuevo.');
    } finally {
      setIsGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // --- LÓGICA DE NEGOCIO ---
  const calcularDias = (fechaStr?: string | null): number => {
    if (!fechaStr) return 0;
    const vence = new Date(fechaStr).getTime();
    const hoy = new Date().getTime();
    const diff = vence - hoy;
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias : 0;
  };

  const { label: nombreDocente } = resolverNombreDocente(user);
  const dias = user?.dias_restantes ?? calcularDias(user?.suscripcion_hasta);

  const statusColor = dias > 30 ? 'bg-emerald-500' : dias > 7 ? 'bg-amber-500' : 'bg-rose-500';
  const statusText = dias > 30 ? 'text-emerald-700' : dias > 7 ? 'text-amber-700' : 'text-rose-700';
  const statusBg = dias > 30 ? 'bg-emerald-50' : dias > 7 ? 'bg-amber-50' : 'bg-rose-50';

  // Link para renovar (va hacia el WhatsApp de soporte de Piero)
  const NUMERO_SOPORTE = '51987654321'; // Reemplaza por tu número real de ventas
  const whatsappHref = getSmartWhatsAppLink(
    NUMERO_SOPORTE,
    `Hola, soy ${nombreDocente} y deseo renovar mi plan en Docente Smart.`
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="lg:pl-64 pb-24 lg:pb-0">
        <div className="max-w-4xl mx-auto p-6 sm:p-10 space-y-8">

          <header className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">
              Mi <span className="text-blue-600">Perfil</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">Gestiona tus datos y verifica tu suscripción.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* COLUMNA IZQUIERDA: DATOS Y CONTACTO */}
            <div className="md:col-span-1 space-y-6">

              {/* CARD: FOTO Y NOMBRE */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200 text-center">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
                  <UserIcon size={32} />
                </div>
                <h2 className="font-bold text-slate-800 text-lg leading-tight uppercase">{nombreDocente}</h2>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-full">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Docente {user?.rol || 'Usuario'}
                  </p>
                </div>
              </div>

              {/* CARD: WHATSAPP (EL CORAZÓN DE LA SOLICITUD) */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Phone size={18} />
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WhatsApp / Contacto</p>
                </div>

                {isEditando ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                      <input
                        autoFocus
                        type="text"
                        value={telefonoInput}
                        onChange={(e) => {
                          setTelefonoInput(e.target.value.replace(/\D/g, '').slice(0, 15)); // Solo números
                          if (errorValidacion) setErrorValidacion(null);
                        }}
                        placeholder="Ej: 987654321"
                        className={`w-full pl-4 pr-4 py-3 rounded-2xl border-2 text-sm font-bold outline-none transition-all ${
                          errorValidacion ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-100 bg-slate-50 focus:border-blue-400'
                        }`}
                      />
                    </div>

                    {errorValidacion && (
                      <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {errorValidacion}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleGuardarTelefono}
                        disabled={isGuardando}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGuardando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Guardar
                      </button>
                      <button
                        onClick={() => {
                          setIsEditando(false);
                          setTelefonoInput(user?.telefono || '');
                          setErrorValidacion(null);
                        }}
                        className="px-4 py-3 bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase hover:bg-slate-200"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                    <div className="min-w-0">
                      <p className={`text-sm font-black ${user?.telefono ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                        {user?.telefono ? `+${user.telefono}` : 'No registrado'}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsEditando(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:border-blue-600 transition-all shadow-sm"
                    >
                      <Pencil size={12} />
                      {user?.telefono ? 'Editar' : 'Agregar'}
                    </button>
                  </div>
                )}
                <p className="text-[9px] text-slate-400 leading-tight italic">
                  * Usamos tu número para avisarte sobre el vencimiento de tu plan.
                </p>
              </div>

              {/* CARD: CORREO */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail size={18} className="text-slate-400" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Correo Principal</p>
                    <p className="text-sm font-bold truncate text-slate-700">{user?.correo}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                disabled={cerrandoSesion}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 text-xs font-black uppercase tracking-widest text-rose-500 bg-white border-2 border-rose-50 hover:bg-rose-50 rounded-[2rem] transition-all disabled:opacity-50"
              >
                {cerrandoSesion ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                Cerrar Sesión
              </button>
            </div>

            {/* COLUMNA DERECHA: ESTADO DE MEMBRESÍA */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-64 h-64 opacity-5 -mr-20 -mt-20 rounded-full ${statusColor}`} />

                <div className="relative z-10">
                  <div className="flex items-center gap-5 mb-10">
                    <div className={`p-5 rounded-[2rem] text-white shadow-xl ${statusColor}`}>
                      <ShieldCheck size={40} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Estado de cuenta</p>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                        {dias > 0 ? 'Suscripción Premium' : 'Acceso Limitado'}
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiempo restante</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl font-black text-slate-900 tabular-nums leading-none">{dias}</span>
                          <span className="text-lg font-black text-slate-300 uppercase">Días</span>
                        </div>
                      </div>
                      <div className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${statusBg} ${statusText}`}>
                        {dias > 30 ? 'Vigente' : dias > 0 ? 'Por vencer' : 'Vencido'}
                      </div>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div className="h-5 w-full bg-slate-100 rounded-full p-1 shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${statusColor}`}
                        style={{ width: `${Math.min(100, (dias / 365) * 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-300" />
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-wider">Vence el:</p>
                      </div>
                      <p className="text-sm font-black text-slate-700 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100">
                        {user?.suscripcion_hasta ? new Date(user.suscripcion_hasta).toLocaleDateString('es-PE', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        }) : 'Sin fecha activa'}
                      </p>
                    </div>
                  </div>

                  {dias <= 7 && (
                    <div className="mt-8 p-5 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-700 animate-pulse">
                      <AlertCircle size={24} className="shrink-0" />
                      <p className="text-xs font-bold leading-relaxed">
                        ¡Atención! Tu acceso finalizará en menos de una semana. Evita perder tus simulacros guardados renovando tu plan.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTÓN DE RENOVACIÓN */}
              {dias <= 30 && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-600 hover:scale-[1.02] transition-all shadow-2xl shadow-slate-300"
                >
                  <Send size={18} />
                  Solicitar Renovación
                </a>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}