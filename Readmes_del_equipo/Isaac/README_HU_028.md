# US-028: Flujo Asistido de Solicitud de Reseteo de Contraseña

**Desarrollador Responsable:** Isaac Ochoa (Backend Developer)  
**Rama:** `sP5`  
**Historia de Usuario:** US-028  

---

## 1. Descripción del Requerimiento
Implementar un mecanismo seguro de recuperación asistida de contraseña para empleados municipales (Trabajadores Rol 2 y Administradores de Departamento Rol 3) que hayan olvidado su credencial de acceso:
1. **Solicitud pública desde Login (`POST /api/solicitudes-password/solicitar`):**
   - Recibe el email del usuario.
   - Aplica política **Zero-Trust Anti-Enumeración**: responde siempre el mismo mensaje neutral tanto si el usuario existe como si no.
   - Si el email corresponde a un empleado activo de los roles 2 o 3, genera una solicitud en la tabla `SolicitudesPassword` con estado `PENDIENTE`.
2. **Bandeja de solicitudes para Superadmin (`GET /api/solicitudes-password`):**
   - Protegido exclusivamente para el **Rol 4 (Superadministrador)**.
   - Retorna las solicitudes pendientes enriquecidas con los datos del solicitante (Nombre, Rol, Dependencia).
3. **Aprobación y Generación de Clave Temporal (`PATCH /api/solicitudes-password/:id/aprobar`):**
   - Exclusivo para Superadmin (Rol 4).
   - Genera una contraseña temporal robusta (o acepta una contraseña provisional personalizada).
   - Aplica hash con `bcrypt` y actualiza el `PasswordHash` del usuario en la base de datos de forma atómica.
   - Marca la solicitud como `APROBADA` y registra el ID del superadministrador resolutor.
4. **Rechazo de Solicitud (`PATCH /api/solicitudes-password/:id/rechazar`):**
   - Permite al Superadmin rechazar solicitudes sospechosas exigiendo un motivo de rechazo (mínimo 5 caracteres).

---

## 2. Componentes de Arquitectura

- **Base de Datos (`schema.sql`):**
  - Creación de la tabla `SolicitudesPassword` con llaves foráneas hacia `Usuarios(IdUsuario)` y `Usuarios(IdSuperadminResolutor)` y check de estado (`PENDIENTE`, `APROBADA`, `RECHAZADA`).
- **Repositorios (`ISolicitudPasswordRepository.js`, `SqlSolicitudPasswordRepository.js`, `MockSolicitudPasswordRepository.js`):**
  - Implementación con transacciones de SQL Server (`sql.Transaction`) garantizando consistencia atómica entre la actualización del hash de usuario y la resolución de la solicitud.
- **Servicio (`PasswordRecoveryService.js`):**
  - Generador de contraseñas provisionales seguras (10 caracteres alfanuméricos con símbolos).
  - Encriptación segura mediante `bcryptjs`.
- **Controlador y Rutas (`PasswordRecoveryController.js`, `passwordRecoveryRoutes.js`, `app.js`, `server.js`):**
  - Rutas integradas y protegidas con `authenticateToken` y `authorizeRoles(4)`.

---

## 3. Pruebas Unitarias y Cobertura
Se creó la suite `tests/solicitudesPassword.test.js`:
- Solicitud pública con protección contra enumeración de usuarios (Zero-Trust).
- Rechazo 403 en la bandeja para roles no autorizados (Roles 1, 2 y 3).
- Aprobación exitosa con generación automática de clave temporal y verificación de login con hash actualizado.
- Asignación de clave provisional personalizada.
- Rechazo de solicitud con validación de motivo obligatorio.

### Resultados de Ejecución:
```powershell
PASS tests/empleadosRbac.test.js
PASS tests/solicitudesPassword.test.js
PASS tests/auth.test.js
PASS tests/incidencias.test.js
PASS tests/empleados.test.js
PASS tests/appBootstrap.test.js
PASS tests/rbacMiddleware.test.js
PASS tests/catalogos.test.js
PASS tests/errorHandler.test.js

Test Suites: 9 passed, 9 total
Tests:       105 passed, 105 total
```
