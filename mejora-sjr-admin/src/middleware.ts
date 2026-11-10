/**
 * middleware.ts
 * Edge Middleware de Next.js para control de acceso por roles (RBAC).
 * 
 * Requerimiento US-005:
 * "El middleware debe bloquear accesos de roles 1 y 2, permitiendo solo el acceso a IdRol=3 e IdRol=4."
 * 
 * Reglas de Seguridad (Cero Confianza / Zero Trust):
 * - Intercepta /dashboard, /admin y sus subrutas.
 * - Extrae el JWT desde la cookie 'mejora_sjr_token'.
 * - Si no hay token, es ilegible o expiró -> Redirige a /no-autorizado.
 * - Si IdRol es 1 (Ciudadano) o 2 (Trabajador) -> Redirige a /acceso-denegado.
 * - Solo IdRol 3 (Admin Depto) o 4 (Superadmin) pueden acceder.
 * - US-021: /admin/personal admite rol 3 para consulta y rol 4 para gestión.
 * - La verificación de firma JWT y los permisos de la API corresponden al backend.
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

  // 2. Proteger rutas del dashboard y administración (/admin)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!token) {
      const unauthorizedUrl = new URL('/no-autorizado', request.url);
      unauthorizedUrl.searchParams.set('motivo', 'sesion_requerida');
      unauthorizedUrl.searchParams.set('origen', pathname);
      return NextResponse.redirect(unauthorizedUrl);
    }

    const payload = decodeJwtPayload(token);

    // Token malformado o ilegible -> Vista Corporativa 401 Unauthorized (US-015)
    if (!payload || !payload.idRol) {
      const unauthorizedUrl = new URL('/no-autorizado', request.url);
      unauthorizedUrl.searchParams.set('motivo', 'token_invalido');
      unauthorizedUrl.searchParams.set('origen', pathname);
      const response = NextResponse.redirect(unauthorizedUrl);
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    // Verificar expiración del token -> Vista Corporativa 401 Unauthorized (US-015)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      const expiredUrl = new URL('/no-autorizado', request.url);
      expiredUrl.searchParams.set('motivo', 'sesion_expirada');
      expiredUrl.searchParams.set('origen', pathname);
      const response = NextResponse.redirect(expiredUrl);
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    // ========================================================
    // REGLA FUNDAMENTAL DE NEGOCIO (US-005 / US-013 / US-015):
    // Bloquear Roles 1 (Ciudadano) y 2 (Trabajador)
    // Si intentan acceder a /admin/* o /dashboard/*, el Route Guard los expulsa
    // hacia la pantalla corporativa (#0A3D62) 403 Forbidden indicando falta de privilegios.
    // ========================================================
    const rol = payload.idRol;
    if (rol === 1 || rol === 2) {
      console.warn(`[Security Middleware] Intento de acceso bloqueado para rol ${rol} (${payload.email}) en ${pathname}`);

      const forbiddenUrl = new URL('/acceso-denegado', request.url);
      forbiddenUrl.searchParams.set('motivo', 'rol_restringido');
      forbiddenUrl.searchParams.set('rol', String(rol));
      forbiddenUrl.searchParams.set('origen', pathname);

      const response = NextResponse.redirect(forbiddenUrl);
      // Se elimina la cookie para limpiar la sesión no autorizada de inmediato
      response.cookies.delete(TOKEN_COOKIE_NAME);
      return response;
    }

    // ========================================================
    // REGLA DE GESTIÓN Y GUARDIA RBAC (US-013 / US-015):
    // La página informativa /admin/acceso-denegado está disponible para roles autenticados (Rol 3 y 4)
    // ========================================================
    if (pathname === '/admin/acceso-denegado') {
      if (rol === 3 || rol === 4) {
        return NextResponse.next();
      }
    }

    // ========================================================
    // US-021: rol 3 puede abrir únicamente el listado /admin/personal.
    // Las demás rutas de gestión conservan el requisito de Superadmin (rol 4).
    // La página informativa de acceso denegado ya se resolvió arriba.
    // ========================================================
    const permiteConsultaPersonal = rol === 3 && (
      pathname === '/admin/personal' || pathname === '/admin/personal/'
    );

    if (pathname.startsWith('/admin') && rol !== 4 && !permiteConsultaPersonal) {
      console.warn(`[Security Middleware] Acceso denegado a ruta de gestión /admin para rol ${rol} (${payload.email})`);
      const deniedUrl = new URL('/admin/acceso-denegado', request.url);
      deniedUrl.searchParams.set('motivo', 'privilegios_superadmin');
      deniedUrl.searchParams.set('rol', String(rol));
      deniedUrl.searchParams.set('origen', pathname);
      return NextResponse.redirect(deniedUrl);
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

    // Cualquier otro rol no reconocido -> Vista Corporativa 403 Forbidden (US-015)
    const fallbackForbiddenUrl = new URL('/acceso-denegado', request.url);
    fallbackForbiddenUrl.searchParams.set('motivo', 'rol_restringido');
    fallbackForbiddenUrl.searchParams.set('origen', pathname);
    const fallbackResponse = NextResponse.redirect(fallbackForbiddenUrl);
    fallbackResponse.cookies.delete(TOKEN_COOKIE_NAME);
    return fallbackResponse;
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
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login']
};
