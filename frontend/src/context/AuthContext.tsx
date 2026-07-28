'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Usuario, AuthResponse } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  login: (authData: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Cargar credenciales guardadas
    const storedToken = localStorage.getItem('primex_token');
    const storedUser = localStorage.getItem('primex_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = (authData: AuthResponse) => {
    setToken(authData.token);
    setUser(authData.usuario);

    // Persistir en LocalStorage
    localStorage.setItem('primex_token', authData.token);
    localStorage.setItem('primex_user', JSON.stringify(authData.usuario));

    // Guardar en Cookie para Next.js Middleware
    document.cookie = `primex_token=${authData.token}; path=/; max-age=604800; SameSite=Lax`;

    router.push('/examenes');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('primex_token');
    localStorage.removeItem('primex_user');
    document.cookie = 'primex_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}