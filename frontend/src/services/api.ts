// src/services/api.ts

const TOKEN_COOKIE = 'primex_token';
const LOGIN_PATH = '/login';

/**
 * Recupera el token JWT desde las cookies del navegador.
 */
function getToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${TOKEN_COOKIE}=`));

  return match ? decodeURIComponent(match.split('=')[1]) : null;
}

/**
 * Utilidad para casos donde el token llega vía OAuth o necesita actualización manual.
 */
export function setToken(token: string) {
  if (typeof document === 'undefined') return;
  const isProd = process.env.NODE_ENV === 'production';
  // 7 días de duración para la sesión
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${isProd ? '; Secure' : ''}`;
}

/**
 * Limpia la sesión del usuario del navegador.
 */
export function clearToken() {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
}

/**
 * Fetch Wrapper Inteligente:
 * - Inyecta JWT automáticamente.
 * - Maneja errores de red.
 * - Detecta colisión de sesiones simultáneas.
 */
export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
  const token = getToken();

  // Configuración de encabezados
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Necesario para que el navegador maneje cookies cross-origin
  });

  // --- MANEJO DE ERRORES (CAPA DE SEGURIDAD) ---
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 401 && typeof window !== 'undefined') {
      // 1. Limpiamos rastro local del token inválido
      clearToken();

      // 2. Verificamos si es una expulsión por límite de dispositivos
      if (errorData.error === "LIMITE_SESIONES_ALCANZADO") {
        window.location.href = `${LOGIN_PATH}?error=session_limit`;
      }
      // 3. De lo contrario, es una expiración normal (o token corrupto)
      else if (!window.location.pathname.startsWith(LOGIN_PATH)) {
        window.location.href = `${LOGIN_PATH}?expired=true`;
      }
    }

    // Propagamos el error para que el componente (Formulario/Página) lo maneje
    throw { status: response.status, ...errorData };
  }

  // --- MANEJO DE RESPUESTAS EXITOSAS ---

  // Caso 204: No Content o respuestas vacías
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return {} as T;
  }

  const text = await response.text();
  try {
    return text ? JSON.parse(text) : ({} as T);
  } catch (err) {
    console.error("Error al parsear JSON de la API:", err);
    return {} as T;
  }
}