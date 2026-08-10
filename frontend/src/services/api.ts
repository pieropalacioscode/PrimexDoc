// src/services/api.ts

export async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
  const token = typeof window !== 'undefined' ? localStorage.getItem('primex_token') : null;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  // 1. Manejo de errores (ya lo tienes)
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('primex_token');
      // window.location.href = '/login?expired=true'; // Opcional: comentar para pruebas
    }
    const errorData = await response.json().catch(() => ({}));
    throw { status: response.status, ...errorData };
  }

  // 2. CORRECCIÓN AQUÍ: Manejar respuestas sin contenido (201, 204)
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return {} as T;
  }

  // 3. Leer el texto primero para verificar si está vacío
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}