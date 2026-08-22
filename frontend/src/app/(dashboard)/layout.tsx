'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, loading } = useAuth();
  const router = useRouter();

  // Soporta tanto 'isLoading' como 'loading'
  const isAuthLoading = isLoading ?? loading;

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Pantalla de carga mientras se valida la sesión
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario, evita renderizar mientras se completa la redirección
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar de navegación */}
      <Sidebar />
      
      {/* Contenido Dinámico */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}