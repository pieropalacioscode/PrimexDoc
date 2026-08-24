'use client';

import { useEffect, useState } from 'react';
import { fetchAPI } from '@/services/api';
import {
  Search,
  Mail,
  Loader2,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  nombre_completo: string;
  correo: string;
  suscripcion_hasta: string;
}

export default function AdminPage() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // ─────────────────────────────────────────────
  // CARGAR USUARIOS
  // ─────────────────────────────────────────────

  const fetchUsuarios = async (
    searchTerm = ''
  ) => {
    setLoading(true);

    try {
      const termino = searchTerm.trim();

      const data = await fetchAPI(
        `/admin/users?q=${encodeURIComponent(termino)}`
      );

      setUsers(
        Array.isArray(data)
          ? (data as AdminUser[])
          : []
      );
    } catch (err) {
      console.error(
        'Error al cargar usuarios:',
        err
      );

      toast.error(
        'No se pudieron cargar los usuarios'
      );

      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // CARGA INICIAL
  // ─────────────────────────────────────────────

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // ─────────────────────────────────────────────
  // RENOVAR SUSCRIPCIÓN
  // ─────────────────────────────────────────────

  const renovar = async (
    userId: string,
    meses: number
  ) => {
    const confirmado = window.confirm(
      `¿Extender suscripción por ${meses} mes(es)?`
    );

    if (!confirmado) {
      return;
    }

    try {
      await fetchAPI(
        `/admin/users/${userId}/renew`,
        {
          method: 'POST',
          body: JSON.stringify({ meses }),
        }
      );

      toast.success(
        'Membresía actualizada correctamente'
      );

      // Mantiene la búsqueda actual después
      // de renovar la suscripción.
      await fetchUsuarios(query);
    } catch (err) {
      console.error(
        'Error al renovar suscripción:',
        err
      );

      toast.error(
        'Error al renovar la suscripción'
      );
    }
  };

  // ─────────────────────────────────────────────
  // BUSCAR
  // ─────────────────────────────────────────────

  const ejecutarBusqueda = () => {
    fetchUsuarios(query);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 min-h-screen bg-slate-50">

      {/* ─────────────────────────────────────────
          HEADER
      ───────────────────────────────────────── */}

      <header className="mb-8">

        <div className="flex items-center gap-3 mb-2">

          <UserCheck
            className="text-blue-600"
            size={32}
          />

          <h1 className="text-3xl font-black text-slate-900">
            Panel de Control
          </h1>

        </div>

        <p className="text-slate-500">
          Gestión de docentes y activaciones premium.
        </p>

      </header>

      {/* ─────────────────────────────────────────
          BUSCADOR
      ───────────────────────────────────────── */}

      <div className="flex gap-4 mb-8">

        <div className="relative flex-1">

          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />

          <input
            type="text"
            placeholder="Buscar por correo o nombre..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-white focus:border-blue-500 outline-none transition-all shadow-sm bg-white"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                ejecutarBusqueda();
              }
            }}
          />

        </div>

        <button
          type="button"
          onClick={ejecutarBusqueda}
          disabled={loading}
          className="bg-blue-600 text-white px-8 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
        >
          {loading ? (
            <Loader2
              size={20}
              className="animate-spin"
            />
          ) : (
            'Buscar'
          )}
        </button>

      </div>

      {/* ─────────────────────────────────────────
          TABLA DE USUARIOS
      ───────────────────────────────────────── */}

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full text-left">

            <thead className="bg-slate-50 border-b border-slate-200">

              <tr>

                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                  Docente
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                  Vencimiento
                </th>

                <th className="px-6 py-4 text-xs font-black uppercase text-slate-400">
                  Acciones de Renovación
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {users.map((u) => {

                const fechaVencimiento =
                  new Date(
                    u.suscripcion_hasta
                  );

                const fechaValida =
                  !Number.isNaN(
                    fechaVencimiento.getTime()
                  );

                const esActivo =
                  fechaValida &&
                  fechaVencimiento > new Date();

                const fechaFormateada =
                  fechaValida
                    ? fechaVencimiento.toLocaleDateString(
                        'es-PE'
                      )
                    : 'Sin fecha';

                return (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >

                    {/* DOCENTE */}

                    <td className="px-6 py-4">

                      <div className="font-bold text-slate-800">
                        {u.nombre_completo ||
                          'Sin nombre'}
                      </div>

                      <div className="text-sm text-slate-400 flex items-center gap-1">

                        <Mail size={12} />

                        {u.correo}

                      </div>

                    </td>

                    {/* VENCIMIENTO */}

                    <td className="px-6 py-4">

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          esActivo
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-rose-100 text-rose-600'
                        }`}
                      >
                        {esActivo
                          ? 'Activo · '
                          : 'Vencido · '}

                        {fechaFormateada}
                      </span>

                    </td>

                    {/* ACCIONES */}

                    <td className="px-6 py-4">

                      <div className="flex gap-2 flex-wrap">

                        <button
                          type="button"
                          onClick={() =>
                            renovar(u.id, 1)
                          }
                          className="bg-slate-100 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                        >
                          +1 MES
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            renovar(u.id, 6)
                          }
                          className="bg-slate-100 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                        >
                          +6 MESES
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            renovar(u.id, 12)
                          }
                          className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-blue-600 transition-all"
                        >
                          +1 AÑO
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

        {/* ─────────────────────────────────────────
            SIN RESULTADOS
        ───────────────────────────────────────── */}

        {users.length === 0 && !loading && (
          <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-2">

            <AlertCircle
              size={40}
              className="text-slate-200"
            />

            <p>
              {query.trim()
                ? 'No se encontraron docentes con esa búsqueda.'
                : 'No hay docentes registrados.'}
            </p>

          </div>
        )}

        {/* ─────────────────────────────────────────
            CARGANDO
        ───────────────────────────────────────── */}

        {loading && (
          <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">

            <Loader2
              size={28}
              className="animate-spin"
            />

            <span className="text-sm">
              Cargando docentes...
            </span>

          </div>
        )}

      </div>

    </div>
  );
}