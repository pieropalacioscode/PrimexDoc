//frontend > src > TS middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('primex_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. RUTAS PRIVADAS (Requieren sesión)
  // Usamos .some para que sea fácil añadir más en el futuro
  const privatePrefixes = ['/examenes', '/simulacro', '/resultados', '/guardados', '/aprendizaje'];
  const isPrivateRoute = privatePrefixes.some(prefix => pathname.startsWith(prefix));

  // 2. RUTAS DE AUTENTICACIÓN (No accesibles si ya estás logueado)
  const authRoutes = ['/login', '/registro', '/forgot-password', '/reset-password'];
  const isAuthRoute = authRoutes.some(route => pathname === route);

  // --- LÓGICA DE PROTECCIÓN ---

  // CASO 1: Intento de entrar a ruta privada SIN TOKEN
  if (isPrivateRoute && !token) {
    // Guardamos la URL a la que quería ir para redirigirlo después del login (Opcional Pro)
    const loginUrl = new URL('/login', request.url);
    // loginUrl.searchParams.set('callbackUrl', pathname); 
    return NextResponse.redirect(loginUrl);
  }

  // CASO 2: Usuario logueado intenta ir a Login/Registro
  if (isAuthRoute && token) {
    // Lo mandamos al catálogo, ya no necesita loguearse
    return NextResponse.redirect(new URL('/examenes', request.url));
  }

  // CASO 3: Landing Page (/)
  // Aquí la dejamos pasar siempre. 
  // Si quieres que el usuario logueado vaya directo a /examenes al entrar a la raíz, 
  // activa esta línea:
  // if (token && pathname === '/') return NextResponse.redirect(new URL('/examenes', request.url));

  return NextResponse.next();
}

// CONFIGURACIÓN DEL MATCHER (El "Filtro" de Next.js)
export const config = {
  matcher: [
    /*
     * Match todas las rutas excepto las que no deben pasar por el middleware:
     * - api (rutas de backend internas de Next)
     * - _next/static (archivos de estilo/js)
     * - _next/image (imágenes optimizadas)
     * - archivos en public (favicon, logo.svg, imágenes locales)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.pdf).*)',
  ],
};