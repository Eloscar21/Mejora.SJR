# Documentación Técnica: US-008 - API CRUD de Empleados
**Módulo:** Backend (API REST)  
**Desarrollador Responsable:** Isaac Ochoa Bocanegra  
**Rama de Entrega:** `sP1`  
**Estado:** ✅ Completado y Validado (12/12 tests unitarios e integración, 48/48 globales)

---

## 1. Resumen de la Historia de Usuario
Proveer los endpoints necesarios para la administración de personal operativo municipal (Trabajadores de Campo y Administradores Departamentales) en **Azure SQL**, aplicando validación estricta de departamentos, control de acceso basado en roles (**RBAC** con JWT) y **Soft Delete** (`Activo = 0`).

---

## 2. Endpoints Implementados

| Método | Endpoint | Roles Permitidos | Descripción |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/empleados` | `3` (Admin Depto), `4` (Superadmin) | Crea un nuevo empleado validando obligatoriedad de departamento (JAPAM o Servicios Públicos). |
| **GET** | `/api/empleados` | `3` (Admin Depto), `4` (Superadmin) | Lista todos los empleados activos (`Activo = 1`). Si es Rol 3, filtra automáticamente por su departamento. |
| **PUT** | `/api/empleados/:id` | `3` (Admin Depto), `4` (Superadmin) | Edita nombre, rol o departamento del empleado respetando las reglas de integridad. |
| **PATCH** | `/api/empleados/:id` | `3` (Admin Depto), `4` (Superadmin) | Desactivación lógica (*Soft Delete*) cambiando `Activo = 0`. |

---

## 3. Arquitectura y Principios de Diseño
- **Inversión de Dependencias (DIP) y Segregación de Interfaces (ISP):**
  - Contrato `IUsuarioRepository.js` define: `crearUsuario`, `listarEmpleadosActivos`, `actualizarEmpleado` y `desactivarEmpleado`.
  - Implementaciones desacopladas: `SqlUsuarioRepository.js` (producción con Azure SQL) y `MockUsuarioRepository.js` (desarrollo y pruebas unitarias aisladas).
- **Skinny Controllers sin `try/catch`:**
  - `EmpleadoController.js` delega la lógica de negocio a `EmpleadoService.js`. Los errores de validación o base de datos son canalizados automáticamente al middleware central `errorHandler.js`.
- **Seguridad Zero-Trust y RBAC:**
  - `authMiddleware.js` (`authenticateToken` y `authorizeRoles`) valida la firma del JWT Bearer y bloquea a Ciudadanos (Rol 1) o perfiles sin privilegios con códigos `401 Unauthorized` o `403 Forbidden`.
  - Ningún endpoint devuelve el `passwordHash` en las respuestas JSON.
  - Se prohíbe que un usuario desactive su propia cuenta mediante validación en el servicio.

---

## 4. Estructura de Base de Datos (Azure SQL)
Se agregó la columna de soporte para borrado lógico a la tabla `Usuarios`:
```sql
ALTER TABLE Usuarios ADD Activo BIT NOT NULL DEFAULT 1;
```
Constraint de integridad respetado:
- `IdRol IN (2, 3)` $\rightarrow$ Obligatorio `IdDepartamento` (1 = JAPAM, 2 = Servicios Públicos).
- `IdRol IN (1, 4)` $\rightarrow$ Obligatorio `IdDepartamento IS NULL`.

---

## 5. Pruebas y Cobertura (Jest)
Archivo de pruebas: `tests/empleados.test.js`
- ✅ 401 si no hay token o es inválido.
- ✅ 403 si un Ciudadano (Rol 1) intenta gestionar empleados.
- ✅ 201 creación exitosa con encriptación bcrypt y omisión de passwordHash.
- ✅ 400 si se omite el departamento para Trabajadores o Admins.
- ✅ 409 si el correo ya está registrado.
- ✅ 200 listado completo para Superadmin y filtrado por scope para Admin Depto.
- ✅ 200 edición exitosa de nombre, rol y departamento.
- ✅ 200 desactivación lógica exitosa y verificación de exclusión del listado.
- ✅ 400 prohibición de auto-desactivación.
