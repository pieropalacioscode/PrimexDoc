'use client';

import { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';
import {
  getSmartWhatsAppLink,
  getMensajeWhatsAppPorEstado,
  EstadoAlerta,
  normalizarTelefonoWhatsApp
} from '@/utils/whatsapp';
import {
  Search, Mail, Loader2, UserCheck, AlertCircle, ShieldAlert, X,
  CheckCircle2, MessageSquare, Bell, Pencil, Send, Check, Clock, UserPlus,
  ExternalLink, ChevronRight
} from 'lucide-react';

// ─────────────────────────────────────────────
// TOAST SISTEMA
// ─────────────────────────────────────────────

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { success: console.log, error: console.error };
  return ctx;
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const value = { success: (msg: string) => push(msg, 'success'), error: (msg: string) => push(msg, 'error') };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => (
          <div key={t.id} className={`flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-in fade-in slide-in-from-bottom-2 ${t.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {t.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
            <span className="flex-1">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

interface AdminUser {
  id: string;
  nombre_completo: string;
  correo: string;
  telefono: string | null;
  suscripcion_hasta: string | null;
}

interface AlertaUsuario {
  id: string;
  correo: string;
  nombre_completo: string;
  telefono: string;
  suscripcion_hasta: string | null;
  creado_en: string;
}

interface ResumenAdmin {
  total_usuarios: number;
  suscripciones_activas: number;
  por_vencer_7_dias: number;
  nuevos_esta_semana: number;
}

type TipoTicket = 'SUGERENCIA' | 'ERROR_CONTENIDO' | 'RECLAMO';

interface SoporteTicket {
  id: string;
  numero_ticket: string;
  tipo: TipoTicket;
  asunto: string;
  detalle: string;
  correo: string;
  metadata: any;
  leido_por_admin: boolean;
  creado_en: string;
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

function AdminPanel() {
  const router = useRouter();
  const toast = useToast();

  const [authState, setAuthState] = useState<'checking' | 'authorized' | 'denied'>('checking');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [resumen, setResumen] = useState<ResumenAdmin | null>(null);
  const [tabAlerta, setTabAlerta] = useState<EstadoAlerta>('nuevo');
  const [alertas, setAlertas] = useState<AlertaUsuario[]>([]);
  const [loadingAlertas, setLoadingAlertas] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [telefonoDraft, setTelefonoDraft] = useState('');
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const [tickets, setTickets] = useState<SoporteTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [notificaciones, setNotificaciones] = useState(0);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<SoporteTicket | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Cargas Iniciales
  useEffect(() => {
    fetchAPI<{ rol?: string }>('/me')
      .then((data) => setAuthState(data?.rol === 'admin' ? 'authorized' : 'denied'))
      .catch(() => setAuthState('denied'));
  }, []);

  const fetchUsuarios = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await fetchAPI<AdminUser[]>(`/admin/users?q=${encodeURIComponent(q)}`);
      setUsers(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }, []);

  const fetchAlertas = useCallback(async (estado: EstadoAlerta) => {
    setLoadingAlertas(true);
    try {
      const endpoints = { nuevo: 'nuevos', por_vencer: 'por-vencer', vencido: 'vencidos' };
      const data = await fetchAPI<AlertaUsuario[]>(`/admin/notificaciones/${endpoints[estado]}`);
      setAlertas(Array.isArray(data) ? data : []);
    } finally { setLoadingAlertas(false); }
  }, []);

  const fetchResumenYStats = useCallback(async () => {
    try {
      const [res, stats] = await Promise.all([
        fetchAPI<ResumenAdmin>('/admin/notificaciones/resumen'),
        fetchAPI<{ no_leidos: number }>('/admin/soporte/stats')
      ]);
      setResumen(res);
      setNotificaciones(stats.no_leidos);
    } catch (e) { console.error(e); }
  }, []);

  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const data = await fetchAPI<SoporteTicket[]>('/admin/soporte/tickets');
      setTickets(Array.isArray(data) ? data : []);
    } finally { setLoadingTickets(false); }
  }, []);

  useEffect(() => {
    if (authState === 'authorized') {
      fetchUsuarios();
      fetchResumenYStats();
      fetchTickets();
    }
  }, [authState, fetchUsuarios, fetchResumenYStats, fetchTickets]);

  useEffect(() => {
    if (authState === 'authorized') fetchAlertas(tabAlerta);
  }, [authState, tabAlerta, fetchAlertas]);

  // 2. Handlers
  const handleGuardarTelefono = async (id: string) => {
    const normalizado = normalizarTelefonoWhatsApp(telefonoDraft);
    if (!normalizado && telefonoDraft !== "") {
      toast.error("Número inválido. Usa 9 dígitos para Perú.");
      return;
    }

    try {
      await fetchAPI(`/admin/users/${id}/telefono`, {
        method: 'PUT',
        body: JSON.stringify({ telefono: normalizado })
      });
      toast.success('Contacto guardado');
      setAlertas(prev => prev.map(a => a.id === id ? { ...a, telefono: normalizado! } : a));
      setUsers(prev => prev.map(u => u.id === id ? { ...u, telefono: normalizado } : u));
      setEditandoId(null);
    } catch (e) { toast.error('Error al guardar'); }
  };

  const handleRenovar = async (id: string, meses: number) => {
    if (!confirm(`¿Extender suscripción por ${meses} mes(es)?`)) return;
    setRenewingId(id);
    try {
      await fetchAPI(`/admin/users/${id}/renew`, { method: 'POST', body: JSON.stringify({ meses }) });
      toast.success('Membresía actualizada');
      fetchUsuarios(query);
      fetchResumenYStats();
      fetchAlertas(tabAlerta);
    } finally { setRenewingId(null); }
  };

  // 3. UI Helpers
  const parseDate = (f: string | null) => {
    if (!f) return null;
    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  };

  if (authState === 'checking') return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (authState === 'denied') return <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-center px-6"><ShieldAlert size={48} className="text-rose-500" /><h1 className="text-xl font-black text-slate-800">Acceso Restringido</h1><p className="text-slate-500">No tienes permisos de administrador.</p><button onClick={() => router.push('/')} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold">Volver al Inicio</button></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 min-h-screen bg-slate-50 space-y-8 pb-24">

      {/* HEADER */}
      <header className="flex justify-between items-start pt-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 italic">Panel <span className="text-blue-600">Admin</span></h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Gestión inteligente de docentes.</p>
        </div>
        <button
          onClick={() => document.getElementById('solicitudes')?.scrollIntoView({ behavior: 'smooth' })}
          className="relative p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition-all group"
        >
          <MessageSquare className="text-slate-400 group-hover:text-blue-600 transition-colors" size={24} />
          {notificaciones > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce border-2 border-white">
              {notificaciones}
            </span>
          )}
        </button>
      </header>

      {/* KPIS */}
      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Docentes', val: resumen.total_usuarios, icon: UserCheck, color: 'text-slate-600', bg: 'bg-white' },
            { label: 'Activos', val: resumen.suscripciones_activas, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50/30' },
            { label: 'Por vencer', val: resumen.por_vencer_7_dias, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50/30' },
            { label: 'Nuevos', val: resumen.nuevos_esta_semana, icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50/30' },
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.bg} p-4 sm:p-6 rounded-[2rem] border border-slate-200 shadow-sm`}>
              <kpi.icon className={`${kpi.color} mb-3`} size={20} />
              <div className="text-2xl sm:text-3xl font-black text-slate-800">{kpi.val}</div>
              <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-tight">{kpi.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* SECCION ALERTAS (MOBILE FRIENDLY CARDS) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30">
          <div className="flex items-center gap-2 font-black text-slate-800 text-xs uppercase tracking-[0.15em]"><Bell size={18} className="text-blue-600" /> Alertas de Membresía</div>
          <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl w-full sm:w-auto">
            {(['nuevo', 'por_vencer', 'vencido'] as EstadoAlerta[]).map((t) => (
              <button key={t} onClick={() => setTabAlerta(t)} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${tabAlerta === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {loadingAlertas ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-400" /></div>
          ) : alertas.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm italic">No hay alertas aquí por ahora.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {alertas.map((a) => {
                const fVence = parseDate(a.suscripcion_hasta);
                const dRestantes = fVence ? Math.ceil((fVence.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                const horasDesdeRegistro = Math.floor((Date.now() - new Date(a.creado_en).getTime()) / (1000 * 60 * 60));
                const esReciente = horasDesdeRegistro < 48;
                const yaEsPremium = fVence && fVence > new Date();

                const link = getSmartWhatsAppLink(a.telefono, getMensajeWhatsAppPorEstado(a.nombre_completo, tabAlerta, dRestantes));

                return (
                  <div key={a.id} className={`relative group bg-white border ${esReciente && tabAlerta === 'nuevo' ? 'border-blue-200 bg-blue-50/20' : 'border-slate-100'} rounded-3xl p-5 transition-all hover:shadow-md`}>

                    {esReciente && tabAlerta === 'nuevo' && (
                      <span className="absolute -top-2 left-6 bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter animate-bounce shadow-lg shadow-blue-200">
                        ¡RECIENTE!
                      </span>
                    )}

                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                      {/* INFO DOCENTE */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-slate-800 text-base truncate">{a.nombre_completo}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${yaEsPremium ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                            {yaEsPremium ? 'Premium' : 'Free'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mb-2">
                          <Mail size={12} /> {a.correo}
                        </div>
                        <div className="flex gap-4">
                           <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-300 uppercase">Registrado</span>
                            <span className="text-[11px] font-bold text-slate-500">{new Date(a.creado_en).toLocaleDateString()} ({horasDesdeRegistro}h)</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-300 uppercase">Estado Membresía</span>
                            <span className={`text-[11px] font-bold ${tabAlerta === 'vencido' ? 'text-rose-500' : tabAlerta === 'por_vencer' ? 'text-amber-500' : 'text-blue-500'}`}>
                              {tabAlerta === 'nuevo' ? (yaEsPremium ? 'Activa' : 'Sin iniciar') : dRestantes < 0 ? `Vencida` : `En ${dRestantes} días`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CONTACTO Y ACCION */}
                      <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0">

                        {editandoId === a.id ? (
                          <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-blue-200">
                            <input autoFocus value={telefonoDraft} onChange={(e) => setTelefonoDraft(e.target.value)} className="bg-transparent px-3 py-1 text-sm w-32 outline-none font-bold" placeholder="Número..." />
                            <button onClick={() => handleGuardarTelefono(a.id)} className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm"><Check size={16} /></button>
                            <button onClick={() => setEditandoId(null)} className="p-2 bg-white text-slate-400 rounded-xl border border-slate-200"><X size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-slate-50/50 px-4 py-2 rounded-2xl border border-slate-100 group/tel">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</span>
                              <span className="text-sm font-black text-slate-700">{a.telefono || '---'}</span>
                            </div>
                            <button onClick={() => { setEditandoId(a.id); setTelefonoDraft(a.telefono || ''); }} className="ml-4 p-2 text-blue-500 hover:bg-white rounded-xl transition-all"><Pencil size={14} /></button>
                          </div>
                        )}

                        {a.telefono ? (
                          <a
                            href={link}
                            target="_blank"
                            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 lg:py-3 rounded-[1.25rem] text-xs font-black uppercase transition-all active:scale-95 shadow-lg shadow-emerald-200"
                          >
                            <Send size={16} />
                            <span>Contactar ahora</span>
                          </a>
                        ) : (
                          <div className="text-center py-3 px-6 bg-slate-100 rounded-[1.25rem] text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Falta Teléfono
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BUSCADOR Y BASE GENERAL */}
      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Buscar docente por nombre o correo..."
            className="w-full pl-14 pr-6 py-5 rounded-[2.25rem] border-2 border-white bg-white shadow-sm outline-none focus:border-blue-500 text-slate-700 font-medium transition-all"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => fetchUsuarios(e.target.value), 400);
            }}
          />
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Base de Datos General</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 border-b">
                <tr><th className="p-6">Docente</th><th className="p-6">Membresía</th><th className="p-6">WhatsApp</th><th className="p-6">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={4} className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-blue-400" /></td></tr>
                ) : users.map(u => {
                  const fObj = parseDate(u.suscripcion_hasta);
                  const activo = fObj ? fObj > new Date() : false;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-6">
                        <div className="font-bold text-slate-800">{u.nombre_completo}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10} />{u.correo}</div>
                      </td>
                      <td className="p-6">
                        {fObj ? (
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 ${activo ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                            {activo ? 'ACTIVO' : 'VENCIDO'} • {fObj.toLocaleDateString('es-PE')}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">Sin suscripción</span>
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-600">{u.telefono || '---'}</span>
                          {u.telefono && (
                            <a href={getSmartWhatsAppLink(u.telefono)} target="_blank" className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-6 flex gap-1">
                        {[1, 6, 12].map(m => (
                          <button key={m} disabled={renewingId === u.id} onClick={() => handleRenovar(u.id, m)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg text-[10px] font-black transition-all disabled:opacity-50">
                            +{m === 12 ? 'AÑO' : `${m}M`}
                          </button>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TICKETS SOPORTE */}
      <div id="solicitudes" className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <div className="font-black text-xs uppercase tracking-widest flex items-center gap-2"><MessageSquare size={18} className="text-blue-600"/> Centro de Soporte</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase">
              <tr><th className="p-6">Ticket</th><th className="p-6">Tipo</th><th className="p-6">Asunto</th><th className="p-6 text-right">Acción</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tickets.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50/50 ${!t.leido_por_admin ? 'bg-blue-50/30' : 'opacity-60'}`}>
                  <td className="p-6"><div className="font-bold text-slate-700">{t.numero_ticket}</div><div className="text-[10px] text-slate-400">{new Date(t.creado_en).toLocaleDateString()}</div></td>
                  <td className="p-6"><span className={`px-2 py-0.5 rounded text-[9px] font-black ${t.tipo === 'RECLAMO' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>{t.tipo}</span></td>
                  <td className="p-6 text-sm font-bold text-slate-600 truncate max-w-[200px]">{t.asunto}</td>
                  <td className="p-6 text-right"><button onClick={() => setTicketSeleccionado(t)} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm">Ver Detalle</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TICKET */}
      {ticketSeleccionado && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setTicketSeleccionado(null)}>
          <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setTicketSeleccionado(null)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X /></button>
            <div className="mb-4 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{ticketSeleccionado.tipo}</span>
              <span className="text-slate-400 font-mono text-xs">{ticketSeleccionado.numero_ticket}</span>
            </div>
            <h3 className="text-2xl font-black mb-1 text-slate-900">{ticketSeleccionado.asunto}</h3>
            <p className="text-xs text-blue-600 font-bold mb-8 italic">{ticketSeleccionado.correo}</p>
            <div className="bg-slate-50 p-6 rounded-2xl text-sm text-slate-600 mb-8 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-slate-100">
              {ticketSeleccionado.detalle}
            </div>
            <button
              onClick={() => {
                fetchAPI(`/admin/soporte/tickets/${ticketSeleccionado.id}/leido`, { method: 'POST' });
                setTickets(prev => prev.map(t => t.id === ticketSeleccionado.id ? { ...t, leido_por_admin: true } : t));
                setTicketSeleccionado(null);
                toast.success('Ticket revisado');
              }}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
            >
              Marcar como revisado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminPanel />
    </ToastProvider>
  );
}