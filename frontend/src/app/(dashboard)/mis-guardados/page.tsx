'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchAPI } from '@/services/api';
import { ExamenResumen, getFavoritos, toggleFavorito } from '@/services/historialService';
import {  EstadoSuscripcion } from '@/types';
import { Bookmark, BookmarkX, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { ExamenCard } from '../ExamenCard';
import { SequenceLaunch } from '../examenes/SequenceLaunch';
import PaywallModal from '@/components/PaywallModal';
import { toast } from 'sonner';

export default function MisGuardadosPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Estados de Datos
  const [favoritos, setFavoritos] = useState<ExamenResumen[]>([]);
  const [suscripcion, setSuscripcion] = useState<EstadoSuscripcion | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de Interacción (Launch & Paywall)
  const [showLaunch, setShowLaunch] = useState(false);
  const [targetExamen, setTargetExamen] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExamenTitulo, setSelectedExamenTitulo] = useState<string>('');

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [dataFavs, dataSub] = await Promise.all([
        getFavoritos().catch(err => {
          console.error("Error favoritos:", err);
          return [];
        }),
        fetchAPI<EstadoSuscripcion>('/me/suscripcion').catch(() => ({
          tiene_acceso: false,
          vence: null
        } as EstadoSuscripcion)),
      ]);

      setFavoritos(dataFavs);
      setSuscripcion(dataSub);
    } catch (err) {
      console.error("Error crítico cargando guardados:", err);
      toast.error('No se pudo sincronizar tu biblioteca');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const tieneAcceso = !!(suscripcion?.tiene_acceso || (suscripcion as any)?.activo);

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await toggleFavorito(id);
      setFavoritos((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error("Error al quitar favorito:", error);
    }
  };

  // Lógica inteligente de redirección
  const handleExamenClick = (examen: ExamenResumen) => {
    if (examen.es_demo || tieneAcceso) {
      setTargetExamen(examen.id);
      setShowLaunch(true);
    } else {
      setSelectedExamenTitulo(examen.titulo);
      setIsModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-cyan-600" size={40} />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sincronizando biblioteca...</p>
      </div>
    );
  }

  return (
    <>
      {/* Animación de Lanzamiento Brutal */}
      {showLaunch && targetExamen && (
        <SequenceLaunch
          onComplete={() => window.location.href = `/simulacro/${targetExamen}`}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-in fade-in duration-700">

        {/* HEADER TIPO DASHBOARD */}
        <header className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-slate-900 text-cyan-400 rounded-3xl shadow-xl shadow-cyan-900/20 border border-cyan-500/30">
              <Bookmark size={32} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                Mis <span className="text-cyan-600">Guardados</span>
              </h1>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                Tu biblioteca personal de entrenamiento
              </p>
            </div>
          </div>

          <Link
            href="/examenes"
            className="flex items-center justify-center gap-2 bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:border-cyan-200 transition-all active:scale-95 shadow-sm"
          >
            Explorar más <ArrowRight size={16} />
          </Link>
        </header>

        {favoritos.length === 0 ? (
          /* ESTADO VACÍO REDISEÑADO */
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
            <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookmarkX size={48} className="text-slate-300" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Tu estante está vacío</h2>
            <p className="text-slate-500 mt-3 mb-10 max-w-sm mx-auto font-medium">
              Guarda los cuadernillos que quieras repasar más tarde haciendo clic en el marcador del catálogo.
            </p>
            <Link
              href="/examenes"
              className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-cyan-600 transition-all shadow-2xl shadow-slate-200"
            >
              Ir al Catálogo <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          /* GRID CONSISTENTE CON EL CATÁLOGO */
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {favoritos.map((examen) => (
              <ExamenCard
                key={examen.id}
                ex={examen as any}
                tieneAcceso={tieneAcceso}
                esFavorito={true}
                onToggleFav={handleRemove}
                onClick={() => handleExamenClick(examen)}
              />
            ))}
          </div>
        )}

        <PaywallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          examenTitulo={selectedExamenTitulo}
        />
      </div>
    </>
  );
}