# US-020: Aislamiento de Datos (RBAC Dinámico) en Empleados

**Desarrollador Responsable:** Isaac Ochoa (Backend Developer)  
**Rama:** `sP4`  
**Historia de Usuario:** US-020  

---

## 1. Descripción del Requerimiento
Implementar aislamiento estricto de datos con RBAC dinámico en la consulta de empleados:
- Endpoint: `GET /api/usuarios/empleados` (y alias retrocompatible `GET /api/empleados`).
- Si el usuario autenticado tiene `idRol === 4` (Superadministrador): retornar toda la tabla de empleados (sin restricción departamental).
- Si el usuario autenticado tiene `idRol === 3` (Administrador de Departamento): inyectar dinámicamente un filtro SQL parametrizado `WHERE IdDepartamento = @IdDepto AND IdRol = 2` utilizando el departamento extraído de su token JWT (`req.usuario.idDepartamento`).

---

## 2. Arquitectura y Cambios Implementados

### 2.1. `authMiddleware.js`
- Se normalizó la decodificación del JWT para exponer tanto `req.user` como `req.usuario` (acorde a la especificación de la historia de usuario).

### 2.2. `EmpleadoService.js`
- En el método `listarEmpleados(usuarioAutenticado, { soloActivos })`:
  - Evalúa `rol`:
    - **Rol 4 (Superadmin)**: delega la consulta sin filtro de departamento, consultando roles de empleados `[2, 3]`.
    - **Rol 3 (Admin de Depto)**: configura filtros estrictos `{ roles: [2], idDepartamento: usuario.idDepartamento }` garantizando que únicamente pueda consultar a los trabajadores subordinados (Rol 2) asignados a su respectivo departamento.

### 2.3. `SqlUsuarioRepository.js`
- Se actualizó el método `obtenerEmpleados({ roles, idDepartamento, soloActivos })`:
  - Inyección de parámetro SQL con tipado seguro:
    ```javascript
    if (idDepartamento !== undefined && idDepartamento !== null) {
      request.input('IdDepto', sql.Int, Number(idDepartamento));
      query += ` AND u.IdDepartamento = @IdDepto`;
    }
    ```
  - Filtrado dinámico de roles en la cláusula SQL (`AND u.IdRol IN (...)`).

### 2.4. `app.js` & `EmpleadoController.js`
- Se montó `createEmpleadoRouter` en el path solicitado `app.use('/api/usuarios/empleados', empleadoRouter)` manteniendo a su vez `app.use('/api/empleados', empleadoRouter)` para retrocompatibilidad con los clientes existentes de administración web.
- `EmpleadoController.listar` extrae `req.usuario || req.user`.

### 2.5. Cobertura de Pruebas Unitarias
- `mejora-sjr-backend/tests/empleados.test.js`:
  - Verificación de que Superadmin (Rol 4) obtiene todos los empleados de todos los departamentos en `/api/usuarios/empleados`.
  - Verificación de que Admin (Rol 3) únicamente recibe trabajadores (Rol 2) de su propio departamento (`IdDepartamento = @IdDepto`).
- **Resultado:** 6 suites de prueba pasando (56 tests exitosos).

---

## 3. Verificación
```powershell
cd mejora-sjr-backend
npm test
```
Resultados:
- `tests/auth.test.js`: PASS
- `tests/empleados.test.js`: PASS
- `tests/appBootstrap.test.js`: PASS
- `tests/rbacMiddleware.test.js`: PASS
- `tests/catalogos.test.js`: PASS
- `tests/errorHandler.test.js`: PASS
