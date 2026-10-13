// frontend/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// --- Utilidad: decodificar JWT sin verificar firma (solo para leer 'exp') ---
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true; // Un JWT debe tener 3 partes

    // Base64URL -> Base64 estándar (atob no entiende '-' y '_')
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadBase64));

    if (!payload.exp) return false; // Si no hay exp, asumimos que es válido

    // Margen de 5s para compensar clock skew entre servidor y edge
    return (payload.exp - 5) < Math.floor(Date.now() / 1000);
  } catch (e) {
    // Token corrupto, mal formado, o payload no es JSON válido -> inválido
    return true;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('primex_token')?.value;
  const { pathname } = request.nextUrl;

  // --- 1. RUTAS PRIVADAS (Requieren sesión válida) ---
  const privatePrefixes = [
    '/examenes',
    '/simulacro',
    '/resultados',
    '/mis-guardados',
    '/perfil',
  ];
  const isPrivateRoute = privatePrefixes.some((prefix) => pathname.startsWith(prefix));

  // --- 2. RUTAS DE AUTENTICACIÓN ---
  const authRoutes = ['/login', '/registro', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // --- 3. VALIDACIÓN REAL DE SESIÓN ---
  // Un token presente pero vencido NO cuenta como logueado.
  const hasValidSession = !!token && !isTokenExpired(token);

  // --- LÓGICA DE NAVEGACIÓN ---

  // Caso A: Intenta entrar a zona privada sin sesión VÁLIDA (sin token, o con token vencido)
  if (isPrivateRoute && !hasValidSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callback', pathname);

    if (token && isTokenExpired(token)) {
      loginUrl.searchParams.set('expired', 'true');
    }

    const response = NextResponse.redirect(loginUrl);

    // Si el token estaba vencido/corrupto, lo limpiamos para no arrastrarlo
    if (token) {
      response.cookies.delete('primex_token');
    }

    return response;
  }

  // Caso B: Ya tiene sesión VÁLIDA e intenta ir a Login/Registro/etc.
  // No tiene sentido volver a loguearse teniendo sesión activa.
  if (isAuthRoute && hasValidSession) {
    return NextResponse.redirect(new URL('/examenes', request.url));
  }

  // Caso C: Landing Page (/), Noticias (/noticias), y todo lo demás público.
  // Territorio neutral: dejamos pasar SIEMPRE, con o sin sesión.
  // Esto permite al docente logueado leer el blog, ver precios, o la home,
  // sin ser rebotado al dashboard.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto:
     * - api (peticiones al backend de Next)
     * - _next/static (scripts y estilos)
     * - _next/image (imágenes optimizadas)
     * - Archivos estáticos (favicon, sitemap, robots, imágenes, pdfs, fuentes)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf|ico|woff|woff2|ttf)).*)',
  ],
};