/**
 * middleware.ts
 * Edge Middleware de Next.js para control de acceso por roles (RBAC).
 * 
 * Requerimiento US-005:
 * "El middleware debe bloquear accesos de roles 1 y 2, permitiendo solo el acceso a IdRol=3 e IdRol=4."
 * 
 * Reglas de Seguridad (Cero Confianza / Zero Trust):
 * - Intercepta todas las peticiones a /dashboard y subrutas.
 * - Extrae el JWT desde la cookie 'mejora_sjr_token'.
 * - Si no hay token o expiró -> Redirige a /login?error=session_expired.
 * - Si IdRol es 1 (Ciudadano) o 2 (Trabajador) -> Bloquea inmediatamente y redirige a /login?error=unauthorized_role.
 * - Solo IdRol 3 (Admin Depto) o 4 (Superadmin) pueden acceder.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE_NAME = 'mejora_sjr_token';

interface JwtPayload {
  idUsuario?: number;
  email?: string;
  idRol?: number;
  idDepartamento?: number | null;
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;

    // Decodificación Base64Url segura para Edge Runtime
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    const decodedString = atob(base64);
    return JSON.parse(decodedString) as JwtPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Obtener la cookie con el token
  const tokenCookie = request.cookies.get(TOKEN_COOKIE_NAME);
  const token = tokenCookie?.value;

  // 2. Proteger rutas del dashboard
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(loginUrl);
    }

    const payload = decodeJwtPayload(token);

    // Token malformado o ilegible
    if (!payload || !payload.idRol) {
      const response = NextResponse.redirect(new URL('/login?error=session_expired', request.url));
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    // Verificar expiración del token
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      const response = NextResponse.redirect(new URL('/login?error=session_expired', request.url));
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    // ========================================================
    // REGLA FUNDAMENTAL DE NEGOCIO (US-005):
    // Bloquear Roles 1 (Ciudadano) y 2 (Trabajador)
    // ========================================================
    const rol = payload.idRol;
    if (rol === 1 || rol === 2) {
      console.warn(`[Security Middleware] Intento de acceso bloqueado para rol ${rol} (${payload.email}) en ${pathname}`);
      
      const response = NextResponse.redirect(new URL('/login?error=unauthorized_role', request.url));
      // Se elimina la cookie para limpiar la sesión no autorizada
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    // ========================================================
    // Solo roles 3 (Admin) y 4 (Superadmin) tienen acceso
    // ========================================================
    if (rol === 3 || rol === 4) {
      // Permitir y pasar headers internos
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', String(payload.idUsuario));
      requestHeaders.set('x-user-role', String(payload.idRol));
      requestHeaders.set('x-user-dept', String(payload.idDepartamento || ''));

      return NextResponse.next({
        request: {
          headers: requestHeaders
        }
      });
    }

    // Cualquier otro rol no reconocido
    return NextResponse.redirect(new URL('/login?error=unauthorized_role', request.url));
  }

  // 3. Si un usuario ya logueado con rol válido entra a /login, llevarlo al dashboard
  if (pathname === '/login' && token) {
    const payload = decodeJwtPayload(token);
    if (payload && (payload.idRol === 3 || payload.idRol === 4)) {
      const now = Math.floor(Date.now() / 1000);
      if (!payload.exp || payload.exp > now) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login']
};
