# Documentación Técnica: Historias de Usuario US-007 y US-009
**Módulos:** Backend API (`mejora-sjr-backend/`) y Front-End Web (`mejora-sjr-admin/`)  
**Desarrollador a Cargo:** Oscar Abraham Granados  
**Fecha de Implementación:** 2026-10-28  
**Rama:** `sP2`  
**Estado:** Completado y Verificado al 100%

---

## 1. Resumen y Valor de Negocio

### A. US-007: Middleware RBAC de Autorización Estricta (Backend)
* **Identificador:** US-007
* **Objetivo:** Implementar en Express un middleware de autorización estricta (`authorizeSuperadmin` / `requireSuperadmin`) que valide criptográficamente el token Bearer JWT e impida de forma categórica el acceso a las rutas de gestión administrativa si `IdRol !== 4`.
* **Valor de Negocio y Seguridad:**
  1. **Principio de Mínimo Privilegio (PoLP):** Garantiza que únicamente la cuenta de Superadministrador (`IdRol = 4`) posea la facultad de crear, modificar y desactivar cuentas operativas y directivas del municipio.
  2. **Bloqueo Defensivo Multinivel:** Si un usuario con credenciales válidas de Ciudadano (`IdRol = 1`), Trabajador de Campo (`IdRol = 2`) o Administrador Departamental (`IdRol = 3`) intenta realizar peticiones hacia endpoints de gestión restringida, el backend responde de inmediato con `403 Forbidden` (`Se requieren privilegios estrictos de Superadmin`).
  3. **Zero Trust & Cobertura de Pruebas:** Acompañado de un suite automatizado en `tests/rbacMiddleware.test.js` que verifica los 6 vectores de acceso (sin token, token inválido, roles 1, 2, 3 y 4).

### B. US-009: UI Tabla de Gestión - Personal Municipal (Frontend)
* **Identificador:** US-009
* **Objetivo:** Desarrollar la pantalla principal (`/admin/personal` y `/dashboard/personal`) con un componente de tabla de datos avanzada (**DataGrid**) que liste de forma reactiva a los empleados municipales, proveyendo:
  - Tarjetas de resumen métrico (Total, Activos, Admins Depto, Personal de Campo).
  - Barra de búsqueda reactiva por texto (Nombre o Correo) y filtros por Rol y Estado.
  - Columnas completas: ID, Empleado (avatar con iniciales, nombre y correo), Rol con badge distintivo, Departamento con icono y Estado (Activo / Inactivo).
  - **Botones de acción:**
    - **Lápiz (Editar):** Abre el modal institucional para modificar el nombre, rol o departamento del empleado.
    - **Basurero (Desactivar):** Abre el diálogo de confirmación para aplicar la baja lógica (*soft delete*) del empleado.
  - Botón primario de cabecera **"+ Nuevo Empleado"** para el alta inmediata.
  - Protección perimetral en Next.js Edge Middleware restringiendo la ruta `/admin/*` a `IdRol = 4`.
* **Valor de Negocio:**
  1. Ofrece una experiencia de usuario (UX) corporativa, ágil y de alto rendimiento para el control de la plantilla del municipio de San Juan del Río.
  2. Desacopla la lógica de visualización mediante la arquitectura **MVVM** (`usePersonalTableViewModel`), integrándose directamente con los contratos `IPersonalServices` y la composición modular de `PersonalFormularios`.

---

## 2. Diagrama de Arquitectura Integral (Edge + MVVM + RBAC Backend)

```mermaid
flowchart TD
    User([Superadministrador / Funcionario]) -->|1. Navega a /admin/personal| EdgeMiddleware[src/middleware.ts<br/>Next.js Edge Middleware]

    subgraph Perimetro_Edge [Seguridad Edge - Next.js]
        EdgeMiddleware -->|Verifica Cookie mejora_sjr_token| TokenValidation{¿Token vigente?}
        TokenValidation -- No --> RedirectLogin[Redirige a /login?error=session_expired]
        TokenValidation -- Sí --> RolCheck{Evaluar IdRol en /admin/*}
        RolCheck -- Rol 1, 2 o 3 --> BlockAdmin[Bloqueo 403 Forbidden<br/>Redirige a /dashboard]
        RolCheck -- Rol === 4 --> AllowPage[Permite acceso a /admin/personal]
    end

    subgraph Capa_Presentacion_MVVM [Frontend: mejora-sjr-admin]
        AllowPage --> AdminPage[src/app/admin/personal/page.tsx]
        AdminPage --> TableVM[src/viewModels/usePersonalTableViewModel.ts]
        AdminPage --> DataGrid[src/views/personal/PersonalDataGrid.tsx]
        DataGrid -->|Botón Lápiz / Basurero / Nuevo| FormComposer[src/providers/PersonalFormularios.tsx]
        FormComposer --> Modals[Modales: Crear, Editar, Desactivar]
        TableVM -->|Inversión de Dependencias| IPersonal[<<interface>> IPersonalServices]
        IPersonal --> EmpleadoApi[EmpleadoApiService.ts]
    end

    subgraph Backend_Seguridad_RBAC [Backend: mejora-sjr-backend]
        EmpleadoApi -->|Petición HTTP con Bearer JWT| ExpressApp[app.js]
        ExpressApp --> RBACMiddleware[src/middlewares/authMiddleware.js<br/>requireSuperadmin / authorizeSuperadmin]
        RBACMiddleware --> CheckRolBackend{¿req.user.idRol === 4?}
        CheckRolBackend -- No (Rol 1, 2, 3) --> Res403[403 Forbidden: Privilegios Insuficientes]
        CheckRolBackend -- Sí (Rol 4) --> EmpleadoCtrl[EmpleadoController.js]
        EmpleadoCtrl --> EmpleadoSvc[EmpleadoService.js]
        EmpleadoSvc --> UsuarioRepo[UsuarioRepository.js (MSSQL / Mock)]
    end
```

---

## 3. Matriz de Componentes y Cumplimiento SOLID

| Archivo / Componente | Capa / Módulo | Principio SOLID | Responsabilidad Implementada |
|---|---|---|---|
| `mejora-sjr-backend/src/middlewares/authMiddleware.js` | Backend - Middleware | **SRP** / **OCP** | Provee `authorizeSuperadmin` y `requireSuperadmin`, desacoplando la lógica de validación de claims RBAC. |
| `mejora-sjr-backend/tests/rbacMiddleware.test.js` | Backend - Testing | **TDD** / **Fiabilidad** | Valida de manera exhaustiva las respuestas 401 y 403 frente a los diferentes roles de usuario. |
| `mejora-sjr-admin/src/middleware.ts` | Frontend - Edge | **Zero Trust** / **Seguridad** | Protege las rutas `/dashboard/:path*` y `/admin/:path*`, bloqueando roles 1 y 2, y exigiendo Rol 4 para `/admin`. |
| `mejora-sjr-admin/src/viewModels/usePersonalTableViewModel.ts` | Frontend - ViewModel | **MVVM** / **SRP** / **DIP** | Gestiona el estado reactivo, búsqueda en memoria, filtrado multi-criterio, feedback y orquestación modal. |
| `mejora-sjr-admin/src/views/personal/PersonalDataGrid.tsx` | Frontend - Vista | **SRP** (Dumb View) | DataGrid institucional con botones de acción **Lápiz** (`Pencil`) y **Basurero** (`Trash2`), métricas KPI y estados de carga. |
| `mejora-sjr-admin/src/app/admin/personal/page.tsx` | Frontend - Ruta | **US-009** | Punto de entrada principal `/admin/personal` ensamblado con inyección de dependencias. |
| `mejora-sjr-admin/src/app/dashboard/personal/page.tsx` | Frontend - Ruta | **Usabilidad** | Punto de acceso homologado dentro de `/dashboard/personal`. |
| `mejora-sjr-admin/src/components/layout/Sidebar.tsx` | Frontend - Navegación | **SRP** | Enlace persistente "Personal Municipal" con icono `Users` y badge distintivo de la historia. |

---

## 4. Matriz de Validación y Casos de Prueba

### A. Casos de Prueba del Middleware RBAC Backend (US-007)
| Caso de Prueba | Método / Endpoint | Token Enviado | Resultado Esperado | Estado |
|---|---|---|:---:|:---:|
| 1. Ausencia de Token | `GET /api/admin/gestion-restringida` | Ninguno | `401 Unauthorized` (`Token no proporcionado`) |  Aprobado |
| 2. Token Inválido | `GET /api/admin/gestion-restringida` | `Bearer corrupto` | `401 Unauthorized` (`Token inválido o expirado`) |  Aprobado |
| 3. Ciudadano (Rol 1) | `GET /api/admin/gestion-restringida` | `Bearer Rol 1` | `403 Forbidden` (`Se requieren privilegios estrictos de Superadmin`) |  Aprobado |
| 4. Trabajador (Rol 2) | `GET /api/admin/gestion-restringida` | `Bearer Rol 2` | `403 Forbidden` (`Se requieren privilegios estrictos de Superadmin`) |  Aprobado |
| 5. Admin Depto (Rol 3) | `GET /api/admin/gestion-restringida` | `Bearer Rol 3` | `403 Forbidden` (`Se requieren privilegios estrictos de Superadmin`) |  Aprobado |
| 6. Superadmin (Rol 4) | `GET /api/admin/gestion-restringida` | `Bearer Rol 4` | `200 OK` (`Acceso concedido a ruta de gestión`) |  Aprobado |

### B. Casos de Prueba del DataGrid Web (US-009)
| Caso de Prueba | Interacción en Pantalla | Resultado Visual y Funcional Esperado | Estado |
|---|---|---|:---:|
| 1. Listado de Personal | Acceder a `/admin/personal` con Superadmin | Carga el DataGrid con todos los empleados, iniciales en avatar, badges de rol y departamento. |  Aprobado |
| 2. Filtro de Búsqueda | Escribir en el campo de texto | Filtra en tiempo real por coincidencia parcial de Nombre o Correo Electrónico. |  Aprobado |
| 3. Botón Lápiz (Editar) | Clic en el botón con icono de **Lápiz** | Abre inmediatamente el modal `EditarEmpleadoModal` con los datos cargados del empleado. |  Aprobado |
| 4. Botón Basurero (Baja) | Clic en el botón con icono de **Basurero** | Abre el diálogo `DesactivarEmpleadoDialog` solicitando confirmación de baja lógica. |  Aprobado |
| 5. Empleado Inactivo | Inspeccionar fila de empleado desactivado | Muestra badge gris "Inactivo" y el botón del Basurero queda inhabilitado. |  Aprobado |
| 6. Botón Nuevo Empleado | Clic en `+ Nuevo Empleado` | Abre el modal `CrearEmpleadoModal` para dar de alta un trabajador o director de área. |  Aprobado |
| 7. Bloqueo de Acceso | Intentar entrar a `/admin/personal` con Rol 1, 2 o 3 | El Edge Middleware y el ViewModel impiden la visualización y muestran alerta de denegación. |  Aprobado |

---

## 5. Instrucciones para Ejecución y Evaluación Local

### 1. Pruebas Automatizadas del Backend (US-007):
En la carpeta `mejora-sjr-backend/`:
```bash
npm test
```
O de forma específica para el suite RBAC:
```bash
node -e "require('os').availableParallelism = () => require('os').cpus().length; const jest = require('jest'); jest.run(['tests/rbacMiddleware.test.js']);"
```

### 2. Comprobación de Tipos en el Front-End (US-009):
En la carpeta `mejora-sjr-admin/`:
```bash
npx tsc --noEmit
```
*Resultado: 0 errores de compilación.*

### 3. Ejecución del Servidor Web:
```bash
npm run dev
```
Acceder en el navegador a `http://localhost:3000/login` e iniciar sesión con la cuenta de Superadmin (`superadmin@test.com` / `Password123!`). En el Sidebar lateral, hacer clic en **"Personal Municipal"** (`/admin/personal`) para interactuar con la tabla DataGrid y sus acciones de edición y baja.
