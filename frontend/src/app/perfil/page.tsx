// frontend/src/app/perfil/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { fetchAPI } from '@/services/api';
import { Clock, ShieldCheck, CreditCard, AlertCircle } from 'lucide-react';

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchAPI('/me').then(setUser).catch(console.error);
  }, []);

  if (!user) return <div className="p-10 text-center">Cargando perfil...</div>;

  const dias = user.dias_restantes;
  const statusColor = dias > 30 ? 'bg-emerald-500' : dias > 7 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-black text-slate-900">Mi Perfil</h1>
        <p className="text-slate-500">Gestiona tu cuenta y membresía.</p>
      </header>

      {/* TARJETA DE MEMBRESÍA INTELIGENTE */}
      <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 -mr-8 -mt-8 rounded-full ${statusColor}`} />
        
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-2xl text-white ${statusColor}`}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Estado de Membresía</p>
            <h2 className="text-xl font-bold text-slate-800">
              {dias > 0 ? 'Plan Premium Activo' : 'Membresía Vencida'}
            </h2>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium text-slate-500">Tiempo restante</span>
            <span className="text-2xl font-black text-slate-900">{dias > 0 ? `${dias} días` : 'Expirado'}</span>
          </div>
          
          {/* BARRA DE PROGRESO VISUAL */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${statusColor}`} 
              style={{ width: `${Math.min(100, (dias / 365) * 100)}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 font-medium">
            Vence el: {new Date(user.suscripcion_hasta).toLocaleDateString('es-PE', { 
              day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </p>
        </div>

        {dias <= 7 && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-bold">
            <AlertCircle size={20} />
            ¡Tu acceso premium está por terminar! Contacta con soporte.
          </div>
        )}
      </div>
    </div>
  );
}