# Documentación Técnica: US-018 - Integración de Logout y Expiración
**Módulo:** Fullstack (Web Admin & Mobile App)  
**Desarrollador Responsable:** Isaac Ochoa Bocanegra  
**Rama de Entrega:** `sP3`  
**Estado:** ✅ Completado y Validado

---

## 1. Resumen de la Historia de Usuario
Garantizar que, si el token JWT expira o presenta fallas en su estructura/firma (ya sea en el ecosistema **Web** o en la aplicación **Móvil**), los **Route Guards** detecten inmediatamente la anomalía y expulsen de forma automática al usuario a la pantalla de inicio de sesión (`/login` o `AuthView`), limpiando al 100% el estado local (Cookies, LocalStorage y Storage en dispositivo).

---

## 2. Implementación en Web Admin (Next.js)

### A. Edge Middleware (`src/middleware.ts`)
* Valida el claim `exp` del JWT en tiempo real:
  ```typescript
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    const response = NextResponse.redirect(new URL('/login?error=session_expired', request.url));
    response.cookies.delete(TOKEN_COOKIE_NAME);
    return response;
  }
  ```
* Si el token no existe, está corrupto o ya expiró, intercepta la petición antes del renderizado, elimina la cookie `mejora_sjr_token` y redirige a `/login?error=session_expired`.

### B. Limpieza de Estado en Cliente (`useLoginViewModel.ts`)
* Al detectar `error=session_expired` o `error=unauthorized_role`, ejecuta inmediatamente:
  ```typescript
  authService.logout();
  ```
  lo cual garantiza la purga total de `localStorage` (`@mejora_sjr_user`) y cookies residuales, mostrando una notificación amigable de sesión vencida.

---

## 3. Implementación en App Móvil (Expo React Native)

### A. Abstracción y Servicio de Autenticación
* Contrato `IAuthService` ampliado con:
  ```typescript
  validarTokenActivo(token?: string): Promise<boolean>;
  ```
* Implementado tanto en `AuthApiService.ts` como en `MockAuthService.ts`:
  - Decodifica el token y valida que no sea nulo ni malformado.
  - Verifica numéricamente que `exp > Date.now() / 1000`.

### B. Route Guard Reactivo en `AppNavigator.tsx`
* Monitorea activamente la pantalla actual (`crearReporte` o `bandejaOrdenes`) y el estado del ciclo de vida del dispositivo (`AppState.addEventListener('change')`):
  - Si el token expiró mientras el usuario operaba la aplicación o si la aplicación regresa de segundo plano con un token vencido, se activa la expulsión:
    ```typescript
    setRoleWarning('Tu sesión ha expirado. Por favor, ingresa tus credenciales nuevamente.');
    await cerrarSesion();
    ```
  - Purga `@mejora_sjr_mobile_token` y `@mejora_sjr_mobile_user` en el storage local y redirige a la vista `auth`.

### C. Arranque Seguro en `useSplashViewModel.ts`
* Durante la inicialización de la app, valida `validarTokenActivo(token)`. Si expiró, invoca `logout()` y envía al usuario directamente a la pantalla de login sin parpadeos ni inconsistencias.
