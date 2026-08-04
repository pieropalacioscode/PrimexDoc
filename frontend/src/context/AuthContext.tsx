'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Usuario, AuthResponse } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  login: (authData: AuthResponse) => void;
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Función para cerrar sesión (Memoizada para evitar re-renders)
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('primex_token');
    localStorage.removeItem('primex_user');
    document.cookie = 'primex_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    router.push('/login');
  }, [router]);

  // Cargar sesión inicial
  useEffect(() => {
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
  }, [logout]);

  // Función Login Tradicional
  const login = useCallback((authData: AuthResponse) => {
    setToken(authData.token);
    setUser(authData.usuario);
    
    localStorage.setItem('primex_token', authData.token);
    localStorage.setItem('primex_user', JSON.stringify(authData.usuario));
    
    // Cookie para el middleware de Next.js
    document.cookie = `primex_token=${authData.token}; path=/; max-age=604800; SameSite=Lax`;
    
    router.push('/examenes');
  }, [router]);

  // Función Login para Google (Procesa el Token y extrae el usuario)
  const loginWithToken = useCallback(async (newToken: string): Promise<boolean> => {
    try {
      // Decodificar el Payload del JWT
      const base64Url = newToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));

      const parsedUser: Usuario = {
        id: payload.user_id,
        correo: payload.correo,
        rol: payload.rol,
        nombre_completo: payload.nombre_completo || 'Docente Primex',
      };

      // Guardar estados
      setToken(newToken);
      setUser(parsedUser);

      // Persistencia
      localStorage.setItem('primex_token', newToken);
      localStorage.setItem('primex_user', JSON.stringify(parsedUser));
      document.cookie = `primex_token=${newToken}; path=/; max-age=604800; SameSite=Lax`;

      return true;
    } catch (error) {
      console.error("Error al procesar token de Google:", error);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
}