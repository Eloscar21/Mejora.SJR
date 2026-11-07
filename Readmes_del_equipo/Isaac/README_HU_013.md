# Documentación Técnica: US-013 - Next.js Edge Middleware (RBAC Guards)
**Módulo:** Web Admin (Next.js 14 Edge Middleware & Routing)  
**Desarrollador Responsable:** Isaac Ochoa Bocanegra  
**Rama de Entrega:** `sP2`  
**Estado:** ✅ Completado y Validado

---

## 1. Resumen de la Historia de Usuario
Implementar una guardia estricta de control de acceso basada en roles (**RBAC**) en el Edge Runtime de Next.js (`src/middleware.ts`) para proteger la integridad de las rutas administrativas de **Mejora SJR**:

1. **Expulsión Inmediata (Roles 1 y 2):** Si un usuario con **Rol 1 (Ciudadano)** o **Rol 2 (Trabajador)** intenta ingresar a cualquier ruta bajo `/admin/*` o `/dashboard/*`, el middleware bloquea el acceso de inmediato, elimina la cookie de sesión y lo expulsa hacia `/login?error=unauthorized_role`.
2. **Redirección de Acceso Denegado (Rol 3):** Si un **Rol 3 (Administrador de Departamento)** intenta ingresar a la ruta `/admin/personal` (o cualquier ruta administrativa de gestión global exclusiva del Superadministrador), el middleware lo intercepta y lo redirige a la página institucional de **Acceso Denegado** (`/admin/acceso-denegado`).
3. **Acceso Exclusivo (Rol 4):** Solo el **Rol 4 (Superadministrador)** cuenta con privilegios totales para operar en `/admin/personal`.

---

## 2. Matriz de Decisiones y Guardias del Middleware

| Rol | Intento de Ruta | Acción del Middleware | Destino Final | Cookie de Sesión |
| :--- | :--- | :--- | :--- | :--- |
| **Rol 1 (Ciudadano)** | `/admin/*` o `/dashboard/*` | **Expulsión Inmediata (401/403)** | `/login?error=unauthorized_role` | **Eliminada** |
| **Rol 2 (Trabajador)** | `/admin/*` o `/dashboard/*` | **Expulsión Inmediata (401/403)** | `/login?error=unauthorized_role` | **Eliminada** |
| **Rol 3 (Admin Depto)** | `/admin/personal` | **Redirección RBAC (US-013)** | `/admin/acceso-denegado` | Conservada |
| **Rol 3 (Admin Depto)** | `/dashboard/*` | **Acceso Autorizado** | `/dashboard/*` | Conservada |
| **Rol 3 (Admin Depto)** | `/admin/acceso-denegado` | **Acceso Permitido (Informativo)** | `/admin/acceso-denegado` | Conservada |
| **Rol 4 (Superadmin)** | `/admin/personal` | **Acceso Autorizado** | `/admin/personal` | Conservada |
| **Sin Token / Expirado**| `/admin/*` o `/dashboard/*` | **Expulsión por Sesión** | `/login?error=session_expired` | Eliminada |

---

## 3. Implementación en `src/middleware.ts`

```typescript
// 1. Expulsión de Roles 1 y 2
const rol = payload.idRol;
if (rol === 1 || rol === 2) {
  console.warn(`[Security Middleware] Intento de acceso bloqueado para rol ${rol} (${payload.email}) en ${pathname}`);
  const response = NextResponse.redirect(new URL('/login?error=unauthorized_role', request.url));
  response.cookies.delete(TOKEN_COOKIE_NAME);
  return response;
}

// 2. Ruta informativa de Acceso Denegado para funcionarios autenticados
if (pathname === '/admin/acceso-denegado') {
  if (rol === 3 || rol === 4) {
    return NextResponse.next();
  }
}

// 3. Bloqueo estricto a Rol 3 en /admin/personal -> Redirección a Acceso Denegado
if (pathname.startsWith('/admin') && rol !== 4) {
  console.warn(`[Security Middleware] Acceso denegado a ruta de gestión /admin para rol ${rol} (${payload.email})`);
  return NextResponse.redirect(new URL('/admin/acceso-denegado', request.url));
}
```

---

## 4. Nueva Vista Institucional: `/admin/acceso-denegado`

Ubicación: `mejora-sjr-admin/src/app/admin/acceso-denegado/page.tsx`
* **Estética Institucional:** Colores oficiales de San Juan del Río (azul marino `#0b132b`, acentos de seguridad en rojo y ámbar).
* **Explicación Transparente:** Informa al Administrador de Departamento que sus permisos están acotados a su dependencia municipal (JAPAM o Servicios Públicos) y que la administración global de personal requiere el rol de Superadministrador (Rol 4).
* **Navegación Asistida:** Botones directos para **Volver al Dashboard** o **Cambiar de Cuenta**.
