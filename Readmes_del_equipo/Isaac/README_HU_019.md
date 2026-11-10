# US-019: Corrección de Lectura de Inactivos y Mapeo Booleano en Backend

**Desarrollador Responsable:** Isaac Ochoa (Backend Developer)  
**Rama:** `sP4`  
**Historia de Usuario:** US-019  

---

## 1. Descripción del Requerimiento
En `mejora-sjr-backend`, la consulta SQL para obtener empleados en `SqlUsuarioRepository` tenía hardcodeada la condición `WHERE u.Activo = 1`, lo que impedía que la pantalla de administración (`PersonalDataGrid.tsx` en `mejora-sjr-admin`) pudiera consultar o filtrar empleados inactivos. Además, el tipo de dato SQL `BIT` retornaba valores numéricos (`1` o `0`) en lugar de tipos booleanos puros (`true` / `false`) requeridos por el frontend.

---

## 2. Cambios Implementados

### 2.1. `mejora-sjr-backend/src/repositories/SqlUsuarioRepository.js`
- Se implementó el método `obtenerEmpleados({ roles = [2, 3], idDepartamento, soloActivos = false })`.
- Se eliminó la cláusula fija `WHERE u.Activo = 1`. Ahora sólo aplica filtro de activos si se solicita explícitamente mediante el parámetro `soloActivos = true`.
- Mapeo explícito del campo `Activo` (bit de SQL) a booleano de JavaScript:
  ```javascript
  activo: record.activo === 1 || record.activo === true
  ```
- Se mantuvo retrocompatibilidad mediante el método `listarEmpleadosActivos(...)` delegando a `obtenerEmpleados(...)`.

### 2.2. `mejora-sjr-backend/src/repositories/IUsuarioRepository.js` y `MockUsuarioRepository.js`
- Se documentó el contrato `obtenerEmpleados` en la interfaz `IUsuarioRepository`.
- Se implementó la lógica en memoria en `MockUsuarioRepository` para filtrar opcionalmente por `soloActivos` y mapear `activo` como booleano (`true`/`false`).

### 2.3. `mejora-sjr-backend/src/services/EmpleadoService.js`
- El método `listarEmpleados(usuarioAutenticado, { soloActivos = false } = {})` invoca `obtenerEmpleados` en el repositorio, propagando el parámetro de filtro y respetando el aislamiento departamental por RBAC (Rol 3 Admin sólo accede a su departamento).

### 2.4. `mejora-sjr-backend/src/controllers/EmpleadoController.js`
- `listar(req, res)` recibe opcionalmente `req.query.soloActivos` y responde `200 OK` con la lista de empleados (activos e inactivos).

### 2.5. Cobertura de Pruebas Unitarias
- `mejora-sjr-backend/tests/empleados.test.js`: Se añadieron aserciones para verificar que los empleados inactivos (`Activo = 0`) se entregan en el listado con `activo: false` estricto y que `?soloActivos=true` filtra únicamente los activos con `activo: true`.
- `mejora-sjr-backend/tests/auth.test.js`: Corrección menor de referencia al mock repository en prueba de login de inactivos.
- **Resultado:** 6 suites de prueba pasando (55 tests exitosos).

---

## 3. Verificación
```powershell
cd mejora-sjr-backend
npm test
```
Todas las suites (`auth`, `empleados`, `appBootstrap`, `rbacMiddleware`, `catalogos`, `errorHandler`) ejecutadas satisfactoriamente sin advertencias ni regresiones.
