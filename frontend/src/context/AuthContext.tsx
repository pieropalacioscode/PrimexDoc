'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Usuario, AuthResponse } from '@/types';
import { useRouter } from 'next/navigation';
import { fetchAPI } from '@/services/api';

interface AuthContextType {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  login: (authData: AuthResponse) => void;
  loginWithToken: (token: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>; // Actualiza datos del perfil contra el backend
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ============================================================
  // CERRAR SESIÓN (Limpieza total y Hard Reset)
  // ============================================================
  const logout = useCallback(() => {
    // 1. Limpieza de estado de React
    setToken(null);
    setUser(null);

    // 2. Limpieza de persistencia
    localStorage.removeItem('primex_token');
    localStorage.removeItem('primex_user');

    // 3. Limpieza de cookie para el Middleware (parámetros exactos para forzar el borrado)
    document.cookie = 'primex_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

    // 4. HARD RESET: Fuerza al navegador a descartar por completo el árbol de React
    // y recargar la app desde cero, garantizando que el Middleware se ejecute contra
    // un entorno 100% limpio.
    window.location.href = '/';
  }, []);

  // ============================================================
  // REFRESH USER (Validar sesión contra el Backend Go)
  // ============================================================
  const refreshUser = useCallback(async () => {
    try {
      const data = await fetchAPI<Usuario>('/me');
      setUser(data);
      localStorage.setItem('primex_user', JSON.stringify(data));
    } catch (error) {
      console.error('Sesión inválida en el servidor');
      logout();
    }
  }, [logout]);

  // ============================================================
  // CARGA INICIAL (Hydration) — SIN REDIRECTS
  // ============================================================
  useEffect(() => {
    const initAuth = () => {
      const storedToken = localStorage.getItem('primex_token');
      const storedUser = localStorage.getItem('primex_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          // JSON corrupto: limpiamos sesión sin redirigir.
          // El Middleware detectará la ausencia de cookie en la siguiente navegación.
          setToken(null);
          setUser(null);
          localStorage.removeItem('primex_token');
          localStorage.removeItem('primex_user');
          document.cookie = 'primex_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // ============================================================
  // LOGIN TRADICIONAL (Acción de usuario)
  // ============================================================
  const login = useCallback((authData: AuthResponse) => {
    const { token, usuario } = authData;

    setToken(token);
    setUser(usuario);

    localStorage.setItem('primex_token', token);
    localStorage.setItem('primex_user', JSON.stringify(usuario));

    // Cookie de 7 días. Vital para que Middleware.ts lea la sesión en el servidor.
    document.cookie = `primex_token=${token}; path=/; max-age=604800; SameSite=Lax;`;

    router.push('/examenes');
  }, [router]);

  // ============================================================
  // LOGIN OAUTH (Decodificación Segura)
  // ============================================================
  const loginWithToken = useCallback(async (newToken: string): Promise<boolean> => {
    try {
      const base64Url = newToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));

      // BLINDAJE: Extraer el rol sin importar si viene de la DB o del JWT
      const parsedUser: Usuario = {
        id: payload.user_id || payload.id,
        correo: payload.correo || payload.email,
        rol: payload.rol, // "admin" o "usuario"
        nombre_completo: payload.nombre_completo || 'Docente Primex',
      };

      setToken(newToken);
      setUser(parsedUser);

      localStorage.setItem('primex_token', newToken);
      localStorage.setItem('primex_user', JSON.stringify(parsedUser));
      document.cookie = `primex_token=${newToken}; path=/; max-age=604800; SameSite=Lax;`;

      return true;
    } catch (error) {
      console.error("Error decodificando token:", error);
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, loginWithToken, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK DE CONSUMO (FUERA DEL PROVIDER)
// ============================================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
}