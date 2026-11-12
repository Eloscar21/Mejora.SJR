# Documentación Técnica: Historias de Usuario US-005 y US-006
**Módulo:** Front-End Web (`mejora-sjr-admin/`)  
**Desarrollador a Cargo:** Oscar Abraham Granados  
**Fecha de Implementación:** 2026-10-26  
**Rama:** `sP1`  
**Estado:** Completado y Verificado

---

## 1. Resumen y Valor de Negocio

### A. US-005: UI de Login Web y Middleware
* **Identificador:** US-005
* **Objetivo:** Diseñar una interfaz de inicio de sesión institucional con patrón **Split Screen** y desplegar un **Next.js Edge Middleware** que intercepte y bloquee el acceso al panel a perfiles sin privilegios de gestión (Ciudadanos `IdRol=1` y Trabajadores `IdRol=2`), permitiendo única y exclusivamente la entrada a Administradores de Departamento (`IdRol=3`) y Superadmins (`IdRol=4`).
* **Valor de Negocio:**
  1. **Seguridad y Cero Confianza (Zero Trust):** Previene que usuarios que legítimamente poseen un token móvil ingresen al panel de administración para modificar o alterar información municipal sensible.
  2. **Identidad Institucional:** Provee una estética gubernamental pulcra para el personal del H. Ayuntamiento de San Juan del Río.

### B. US-006: Layout Web (Dashboard) y Pruebas JWT
* **Identificador:** US-006
* **Objetivo:** Construir el esqueleto visual del panel administrativo mediante un **Sidebar fijo en azul marino institucional** y habilitar en el área central un **inspector criptográfico de tokens JWT** que decodifique y renderice los claims en vivo (`idUsuario`, `email`, `idRol`, `idDepartamento`, `iat`, `exp`).
* **Valor de Negocio:**
  1. Permite auditar en tiempo real qué funcionario y de qué dependencia (`JAPAM` o `Servicios Públicos`) está operando el sistema.
  2. Facilita las pruebas de integración continua y la homologación entre el backend de Express y el frontend de Next.js.

---

## 2. Diagrama de Arquitectura Global (MVVM + Edge Middleware)

```mermaid
flowchart TD
    Client([Navegador Web / Funcionario]) -->|1. Intento de Acceso /dashboard| Middleware[src/middleware.ts<br/>Next.js Edge Middleware]
    
    subgraph Capa_Seguridad_Edge [Seguridad Perimetral Edge]
        Middleware -->|Lee Cookie| CookieCheck{¿mejora_sjr_token existe?}
        CookieCheck -- No --> RedirExpirado[Redirige a /login?error=session_expired]
        CookieCheck -- Sí --> DecodePayload[Decodifica Base64Url sin dependencias pesadas]
        
        DecodePayload --> CheckRole{Evaluar IdRol del Payload}
        CheckRole -- Rol 1 (Ciudadano)<br/>o Rol 2 (Trabajador) --> Bloqueo[403 Bloqueo Estricto<br/>Elimina Cookie<br/>Redirige a /login?error=unauthorized_role]
        CheckRole -- Rol 3 (Admin)<br/>o Rol 4 (Superadmin) --> Permiso[200 Pasa al Layout y Dashboard]
    end

    subgraph Capa_Presentacion_MVVM [Arquitectura MVVM - mejora-sjr-admin]
        Permiso --> DashboardLayout[DashboardLayout.tsx]
        DashboardLayout --> Sidebar[Sidebar.tsx<br/>Fijo Azul Marino #0b132b]
        DashboardLayout --> Navbar[Navbar.tsx<br/>Badges de Rol y Depto]
        DashboardLayout --> DashboardPage[dashboard/page.tsx<br/>Inspector de Claims y JSON JWT]
        
        LoginPage[login/page.tsx] --> LoginView[LoginView.tsx<br/>Split Screen Institucional]
        LoginView --> LoginVM[useLoginViewModel.ts]
        LoginVM --> IAuth[<<interface>> IAuthService]
        IAuth --> AuthApi[AuthApiService.ts]
        IAuth --> MockAuth[MockAuthService.ts]
    end

    subgraph Backend_N_Capas [mejora-sjr-backend (Node/Express)]
        AuthApi -->|POST /api/auth/login| BackendRouter[authRoutes.js]
        BackendRouter --> BackendCtrl[AuthController.js]
        BackendCtrl --> BackendSvc[AuthService.js]
        BackendSvc --> BackendRepo[Sql / MockUsuarioRepository.js]
    end
```

---

## 3. Matriz de Componentes y Cumplimiento SOLID

| Archivo / Componente | Capa | Principio SOLID | Responsabilidad Implementada |
|---|---|---|---|
| `src/models/auth.types.ts` | Modelos | **ISP** / **SRP** | Define contratos de datos de usuario, credenciales, tokens decodificados y diccionarios de roles/dependencias. |
| `src/services/contracts/IAuthService.ts` | Contratos | **DIP** (Inversión de Dependencias) | Interfaz abstracta que desacopla los ViewModels de implementaciones concretas de red. |
| `src/services/api/AuthApiService.ts` | Servicios | **LSP** (Sustitución de Liskov) | Cliente HTTP que consume `/api/auth/login` y persiste la cookie de sesión `mejora_sjr_token`. |
| `src/services/mocks/MockAuthService.ts` | Servicios | **LSP** | Simulación autónoma en memoria con las 4 cuentas semilla de San Juan del Río para pruebas offline. |
| `src/viewModels/useLoginViewModel.ts` | ViewModel | **SRP** / **MVVM** | Maneja la reactividad del formulario de login, captura alertas de bloqueo del Middleware y coordina la navegación. |
| `src/views/auth/LoginView.tsx` | Vista | **SRP** (Dumb View) | UI Split Screen institucional con panel izquierdo heráldico y panel derecho con formulario y drawer de pruebas rápidas. |
| `src/middleware.ts` | Seguridad | **Cero Confianza (Zero Trust)** | Interceptor Edge que bloquea perfiles 1 y 2, permitiendo el ingreso solo a roles 3 y 4. |
| `src/components/layout/Sidebar.tsx` | Componente | **SRP** | Barra lateral fija en azul marino institucional (`#0b132b`) con navegación y control de cierre de sesión. |
| `src/components/layout/Navbar.tsx` | Componente | **SRP** | Cabecera superior con insignias dinámicas de rol y departamento asignado. |
| `src/views/layout/DashboardLayout.tsx` | Vista | **SRP** / **Layout** | Orquestador de la disposición espacial del panel administrativo. |
| `src/app/dashboard/page.tsx` | Página | **US-006** | Decodificador e impresor en tiempo real del JSON íntegro del JWT con desglose de claims. |

---

## 4. Matriz de Cuentas Semilla y Verificación de Pruebas

Para validar las reglas de negocio del Middleware y del Dashboard, se utilizan las credenciales provistas por el Backend:

| Correo de Prueba | Contraseña | Perfil | IdRol | IdDepartamento | Resultado Esperado en Web |
|---|---|---|:---:|:---:|---|
| `ciudadano@test.com` | `Password123!` | Ciudadano | **1** | `null` | ❌ **BLOQUEO INMEDIATO:** El Middleware rechaza el acceso y redirige a `/login?error=unauthorized_role`. |
| `trabajador@test.com` | `Password123!` | Trabajador | **2** | `1` (JAPAM) | ❌ **BLOQUEO INMEDIATO:** El Middleware rechaza el acceso y redirige a `/login?error=unauthorized_role`. |
| `admin@test.com` | `Password123!` | Administrador | **3** | `2` (Servicios Públicos) |  **ACCESO CONCEDIDO:** Ingresa a `/dashboard`. El inspector muestra `IdRol: 3` y `Depto: 2`. |
| `superadmin@test.com` | `Password123!` | Superadmin | **4** | `null` (Jurisdicción Total) |  **ACCESO CONCEDIDO:** Ingresa a `/dashboard`. El inspector muestra `IdRol: 4` y `Superadmin`. |

---

## 5. Instrucciones de Ejecución y Validación

1. **Iniciar el Backend:**
   ```bash
   cd mejora-sjr-backend
   npm run dev
   ```
   *(El servidor iniciará en `http://localhost:5000`)*

2. **Iniciar el Frontend Administrativo:**
   ```bash
   cd mejora-sjr-admin
   npm install
   npm run dev
   ```
   *(El panel iniciará en `http://localhost:3000`)*

3. **Ejecutar Pruebas de Roles:**
   * Navega a `http://localhost:3000/login`.
   * En el panel derecho de login, utiliza los botones de prueba rápida para verificar el bloqueo de **Ciudadano** y **Trabajador**.
   * Ingresa con **Admin** o **Superadmin** y verifica que en el Dashboard el JSON decodificado del JWT imprima exactamente los claims esperados.
