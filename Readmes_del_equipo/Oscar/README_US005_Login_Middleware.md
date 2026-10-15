# Historia de Usuario: UI de Login y Middleware Web (US-005)
**Desarrollador:** Oscar Rivera  
**Área:** Full-Stack (Back-End `mejora-sjr-backend/` & Front-End Web `mejora-sjr-admin/`)  
**Rama:** `sP1`  
**Estado:** Fase 1 Completada (Infraestructura de Autenticación, Endpoint Backend y Contratos Frontend MVVM)

---

## 1. Resumen y Valor de Negocio

El sistema **Mejora SJR** es una plataforma de gobierno digital para el municipio de San Juan del Río orientada a erradicar la burocracia en el reporte de incidencias urbanas. La seguridad y el control de accesos son críticos para garantizar la integridad institucional.

La **US-005** provee la infraestructura completa de autenticación para el panel web administrativo y establece los cimientos del control de accesos:
1. **Filtro Estricto de Roles Web:** Los ciudadanos (`IdRol = 1`) y las cuadrillas de campo (`IdRol = 2`) tienen restringida su operación exclusivamente a la aplicación móvil (React Native). El acceso web está reservado única y estrictamente para **Administradores de Departamento** (`IdRol = 3`) y **Superadmin / Alcalde** (`IdRol = 4`).
2. **Seguridad Cero Confianza (Zero Trust):** La sesión del usuario se expide en una cookie `HttpOnly`, `SameSite=Strict` y `Secure` (en producción), protegiendo al personal municipal contra ataques de Cross-Site Scripting (XSS) y Cross-Site Request Forgery (CSRF).
3. **Desacoplamiento Frontend (MVVM + DIP):** Se establecen los contratos e interfaces (`IAuthService`) para que la pantalla de inicio de sesión y los ViewModels funcionen sin depender de implementaciones concretas de red ni acoplarse directamente a librerías HTTP.

---

## 2. Diagrama de Arquitectura Global

```mermaid
flowchart TD
    subgraph Frontend_Web [Front-End: mejora-sjr-admin (MVVM)]
        subgraph View_Layer [src/views/ & src/app/]
            LoginPage[app/login/page.tsx<br/>Ruta Next.js App Router]
            LoginView[LoginView.tsx<br/>Dumb Component UI]
        end

        subgraph ViewModel_Layer [src/viewModels/]
            LoginVM[useLoginViewModel.ts<br/>- email, password<br/>- isLoading, errorMessage<br/>- submitLogin()]
        end

        subgraph Contracts_Layer [src/services/contracts/ (ISP)]
            IAuth[<<interface>> IAuthService<br/>+login(credentials): Promise<LoginResult>]
        end

        subgraph Service_Implementations [src/services/ (LSP / DIP)]
            MockAuth[MockAuthService<br/>Simulación local offline]
            ApiAuth[AuthApiService<br/>Consumo HTTP fetch con credenciales]
            IAuth -.->|Implementa| MockAuth
            IAuth -.->|Implementa| ApiAuth
        end

        subgraph Edge_Security [src/middleware.ts]
            NextMiddleware[Next.js Edge Middleware<br/>Inspecciona cookie mejora_sjr_token<br/>Redirige a /login si no autenticado]
        end
    end

    subgraph Backend_API [Back-End: mejora-sjr-backend (N-Capas)]
        subgraph Routing_and_Controllers [src/routes/ & src/controllers/ (SRP)]
            AuthRouter[authRoutes.js<br/>POST /api/auth/login]
            LoginCtrl[LoginController.js<br/>Valida HTTP body y setea HttpOnly Cookie]
        end

        subgraph Business_Services [src/services/ (SRP)]
            LoginSvc[LoginService.js<br/>- Valida email y password<br/>- timing-safe compare con bcrypt<br/>- Restricción roles 1 y 2<br/>- Emisión JWT]
        end

        subgraph Data_Repositories [src/repositories/ (OCP / LSP)]
            IRepo[<<interface>> IUsuarioRepository<br/>+buscarPorEmailConHash(email)]
            UserRepo[UsuarioRepository.js<br/>Consulta Azure SQL con PasswordHash]
            IRepo -.->|Implementa| UserRepo
        end

        subgraph Security_Infrastructure [src/config/ & src/errors/]
            TokenSigner[tokenSigner.js<br/>Adaptador JWT - jsonwebtoken]
            Hasher[hasher.js<br/>Adaptador Bcrypt]
            CredError[CredencialesInvalidasError.js<br/>Mapeado a HTTP 401 en errorHandler]
        end
    end

    %% Relaciones Front
    LoginPage --> LoginView
    LoginView --> LoginVM
    LoginVM -->|Depende de abstracción| IAuth
    NextMiddleware -.->|Protege rutas privadas| LoginPage

    %% Relaciones Front -> Back
    ApiAuth -->|Petición POST con credenciales| AuthRouter

    %% Relaciones Back
    AuthRouter --> LoginCtrl
    LoginCtrl --> LoginSvc
    LoginSvc --> IRepo
    LoginSvc --> Hasher
    LoginSvc --> TokenSigner
    LoginCtrl -.->|Mapea error a 401| CredError
```

---

## 3. Matriz de Componentes y Responsabilidades

| Componente | Capa | Ubicación | Responsabilidad Arquitectónica |
|---|---|---|---|
| `CredencialesInvalidasError.js` | Dominio / Errores | `mejora-sjr-backend/src/errors/` | Error de dominio genérico ("Credenciales incorrectas") para prevenir enumeración de usuarios (CWE-204). |
| `IUsuarioRepository.js` | Contratos BD | `mejora-sjr-backend/src/repositories/` | Declara el método `buscarPorEmailConHash(email)` segregado de las consultas de registro. |
| `UsuarioRepository.js` | Acceso a Datos | `mejora-sjr-backend/src/repositories/` | Ejecuta la consulta SQL parametrizada recuperando `IdUsuario`, `Email`, `PasswordHash`, `IdRol` e `IdDepartamento`. |
| `tokenSigner.js` | Infraestructura | `mejora-sjr-backend/src/config/` | Adaptador desacoplado para la firma y verificación de JSON Web Tokens mediante `jsonwebtoken`. |
| `LoginService.js` | Lógica de Negocio | `mejora-sjr-backend/src/services/` | Orquesta la autenticación: validación de entrada, comparación segura de hash, filtro de roles no web (IdRol 1 y 2) y generación de token. |
| `LoginController.js` | Red / HTTP | `mejora-sjr-backend/src/controllers/` | Recibe la petición HTTP, invoca al servicio y despacha la cookie `mejora_sjr_token` como `HttpOnly`, `SameSite=Strict`. |
| `errorHandler.js` | Middleware | `mejora-sjr-backend/src/middlewares/` | Traduce de forma centralizada `CredencialesInvalidasError` a código HTTP `401 Unauthorized`. |
| `container.js` | Composición (IoC) | `mejora-sjr-backend/src/config/` | Contenedor de Inversión de Control donde se instancian e inyectan repositorios, adaptadores y servicios. |
| `authRoutes.js` | Enrutamiento | `mejora-sjr-backend/src/routes/` | Expone la ruta `POST /login` inyectando el controlador correspondiente. |
| `IAuthService.ts` | Contratos Frontend | `mejora-sjr-admin/src/services/contracts/` | Contrato TypeScript que define el método abstracto `login(credentials): Promise<LoginResult>`. |
| `next.config.ts` & config | Infraestructura Web | `mejora-sjr-admin/` | Configuración base del proyecto Next.js en App Router con TypeScript y ESLint. |

---

## 4. Principios SOLID Aplicados

### S — Single Responsibility Principle (Responsabilidad Única)
* **Separación de Servicios:** El `LoginService` gestiona exclusivamente las reglas de autenticación y validación de contraseñas. No maneja registros de ciudadanos ni interactúa con cookies HTTP.
* **Aislamiento en Repositorio:** El método `buscarPorEmail` (utilizado por el registro) no retorna el campo sensible `PasswordHash`. Se implementó un método exclusivo `buscarPorEmailConHash` para la autenticación, evitando propagar datos innecesarios en otros flujos.
* **Controlador HTTP:** `LoginController` no contiene lógica SQL ni valida algoritmos criptográficos; su única tarea es desempaquetar el request, invocar el caso de uso y establecer la cookie de transporte.

### O — Open/Closed Principle (Abierto a Extensión, Cerrado a Modificación)
* **Inyección en Rutas:** La función fábrica `createAuthRouter(registroController, loginController)` permite incorporar nuevos controladores o sustituirlos por mocks en pruebas de integración sin modificar el código interno del router.
* **Contratos Frontend:** El contrato `IAuthService` permite extender el sistema añadiendo proveedores OAuth (ej. Google, Azure AD) o servicios mock sin requerir cambios en los ViewModels.

### L — Liskov Substitution Principle (Sustitución de Liskov)
* **Repositorios de Datos:** `UsuarioRepository` extiende e implementa fielmente `IUsuarioRepository`. En pruebas unitarias puede sustituirse por un `MockUsuarioRepository` en memoria sin que `LoginService` experimente anomalías.
* **Servicios de Autenticación Frontend:** Cualquier implementación que respete `IAuthService` (`MockAuthService` o `AuthApiService`) es completamente intercambiable en el ViewModel.

### I — Interface Segregation Principle (Segregación de Interfaces)
* `IAuthService.ts` declara únicamente la función `login(credentials)`. No se fuerza a los clientes a depender de métodos de registro, recuperación de contraseña o refresh tokens si no los necesitan en esta pantalla.

### D — Dependency Inversion Principle (Inversión de Dependencias)
* **Contenedor IoC Backend:** `LoginService` no realiza un `require` estático del repositorio ni de `jsonwebtoken`; recibe `usuarioRepository`, `hasher` y `tokenSigner` a través de su constructor desde `container.js`.
* **Desacoplamiento Frontend:** La capa de presentación y los ViewModels dependen de la abstracción `IAuthService` y nunca de implementaciones concretas basadas en `fetch` o `axios`.

---

## 5. Protocolos de Seguridad y Regla de Cero Confianza (Zero Trust)

1. **Transporte Seguro de Sesión (Cookie HttpOnly):**
   * El token JWT no se almacena en `localStorage` ni `sessionStorage` para evitar el robo de credenciales mediante ataques de inyección de scripts (XSS).
   * La cookie `mejora_sjr_token` se configura con:
     * `httpOnly: true` (inaccesible desde `document.cookie` en JavaScript del cliente).
     * `sameSite: 'strict'` (mitiga el envío no intencionado en peticiones cruzadas CSRF).
     * `secure: process.env.NODE_ENV === 'production'` (transmisión forzada por HTTPS).
     * `maxAge: 8 * 60 * 60 * 1000` (8 horas de vigencia sincronizadas con el JWT).

2. **Mitigación de Enumeración de Usuarios (CWE-204):**
   * Tanto si el usuario no existe en la base de datos como si la contraseña es errónea, la respuesta del sistema es idéntica: `401 Unauthorized` con el mensaje neutro `"Credenciales incorrectas"`.
   * Para evitar ataques de temporización (timing attacks), si el usuario no existe se ejecuta un cálculo simulado con bcrypt contra un hash ficticio, asegurando un tiempo de respuesta uniforme.

3. **Restricción de Acceso por Plataforma:**
   * Si un usuario con `IdRol = 1` (Ciudadano) o `IdRol = 2` (Trabajador) intenta iniciar sesión en el panel web administrativo, el servicio deniega el acceso automáticamente con `CredencialesInvalidasError`, preservando el perímetro operativo del municipio.

---

## 6. Dependencias del Proyecto

Para replicar el entorno de ejecución, verificar que las dependencias estén instaladas:

### Backend (`mejora-sjr-backend/`)
* `jsonwebtoken`: Manejo, firma y verificación de tokens de autenticación JWT.
* `bcrypt`: Hashing unidireccional y comparación segura de contraseñas.
* `mssql`: Driver de conexión para Microsoft Azure SQL.
* `express`: Servidor HTTP y middleware.
* `dotenv`: Carga de variables de entorno seguras.

```bash
cd mejora-sjr-backend
npm install
```

### Frontend (`mejora-sjr-admin/`)
* `next` (v15+): Framework web React con App Router.
* `react` & `react-dom`: Librería de interfaces de usuario.
* `typescript`: Tipado estático para contratos e interfaces MVVM.
* `eslint` & `eslint-config-next`: Linter de código estricto.

```bash
cd mejora-sjr-admin
npm install
```

---

## 7. Pasos Siguientes para Completar la US-005

1. Implementar `MockAuthService.ts` y `AuthApiService.ts` en `src/services/`.
2. Implementar el ViewModel `useLoginViewModel.ts` en `src/viewModels/`.
3. Diseñar la vista pura `LoginView.tsx` y la ruta `app/login/page.tsx`.
4. Configurar el middleware de Next.js (`src/middleware.ts`) para la intercepción de rutas protegidas y redirección automática a `/login`.
