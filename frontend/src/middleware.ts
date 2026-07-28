import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('primex_token')?.value;
  const { pathname } = request.nextUrl;

  // Rutas que requieren estar autenticado
  const isProtectedRoute = pathname.startsWith('/examenes') || pathname.startsWith('/simulacro') || pathname.startsWith('/mis-evaluaciones');

  // Si intenta acceder a rutas protegidas sin token
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Si ya tiene sesión e intenta ir a login/registro
  if ((pathname === '/login' || pathname === '/registro') && token) {
    const examenesUrl = new URL('/examenes', request.url);
    return NextResponse.redirect(examenesUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/examenes/:path*', '/simulacro/:path*', '/mis-evaluaciones/:path*', '/login', '/registro'],
};