# US-025: Gestión de Incidencias: Filtro RBAC, Asignación y Descarte de Ficticios

**Desarrollador Responsable:** Isaac Ochoa (Backend Developer)  
**Rama:** `sP5`  
**Historia de Usuario:** US-025  

---

## 1. Descripción del Requerimiento
Implementar la gestión administrativa y operativa de incidencias para roles de personal (Roles 3 Admin y 4 Superadmin):
1. **Listado con RBAC dinámico (`GET /api/incidencias`):**
   - **Rol 4 (Superadmin):** Consulta incidencias de todo el municipio sin restricción departamental.
   - **Rol 3 (Admin de Departamento):** Inyecta automáticamente el filtro departamental del JWT (`IdDepartamento = @IdDepto`).
   - **Rol 2 (Trabajador):** Visualiza incidencias de su departamento o asignadas a él.
2. **Asignación a Cuadrilla (`PATCH /api/incidencias/:id/asignar`):**
   - Asigna un trabajador operativo (Rol 2) validando que pertenezca al mismo departamento de la incidencia.
   - Actualiza el estado a `IdEstado = 2` (*En Revisión* / Asignado).
3. **Descarte de Reportes Ficticios (`PATCH /api/incidencias/:id/descartar`):**
   - Marca la incidencia con `IdEstado = 5` (*Rechazado* / Ficticio).
   - Exige un motivo de rechazo (`motivoRechazo`) para auditoría municipal, evitando borrar físicamente el registro.

---

## 2. Arquitectura y Componentes Implementados

### 2.1. Contrato e Implementaciones del Repositorio
- **`IIncidenciaRepository.js`**:
  - `listarIncidencias({ idDepartamento, idEstado, idTrabajadorAsignado })`
  - `asignarTrabajador(idIncidencia, idTrabajador, nuevoEstado)`
  - `descartarIncidencia(idIncidencia, motivoRechazo)`
- **`SqlIncidenciaRepository.js`**:
  - Consulta optimizada apoyada en la vista desnormalizada `vw_IncidenciasDetalle`.
  - Inyección de parámetros SQL tipados (`sql.Int`, `sql.NVarChar`) para evitar SQL Injection.
- **`MockIncidenciaRepository.js`**: Implementación en memoria adaptada para pruebas unitarias.

### 2.2. Capa de Negocio (`IncidenciaService.js`)
- `listarIncidencias(usuarioAutenticado, filtros)`: Aplica aislamiento estricto por departamento si el rol es 3.
- `asignarTrabajador(idIncidencia, idTrabajador, usuarioAutenticado)`:
  - Valida permisos departamentales (el Admin sólo asigna incidencias de su secretaría).
  - Valida que el trabajador pertenezca al mismo departamento.
- `descartarIncidencia(idIncidencia, { motivoRechazo }, usuarioAutenticado)`:
  - Valida longitud mínima del motivo de rechazo (al menos 5 caracteres).
  - Verifica aislamiento departamental por RBAC.

### 2.3. Capa de Presentación (`IncidenciaController.js` y `incidenciaRoutes.js`)
- Endpoints publicados y protegidos con `authenticateToken` y `authorizeRoles(3, 4)`:
  - `GET /api/incidencias`
  - `PATCH /api/incidencias/:id/asignar`
  - `PATCH /api/incidencias/:id/descartar`

---

## 3. Pruebas Unitarias y Cobertura
Se expandió la suite `tests/incidencias.test.js`:
- Verificación de visibilidad total para Superadmin (Rol 4).
- Verificación de aislamiento departamental para Admin (Rol 3).
- Rechazo 403 para Ciudadanos al endpoint administrativo.
- Asignación exitosa a cuadrilla y rechazo en asignaciones interdepartamentales no autorizadas.
- Descarte exitoso a Estado 5 con motivo y rechazo de motivos vacíos.

### Resultados:
```powershell
PASS tests/empleadosRbac.test.js
PASS tests/incidencias.test.js
PASS tests/auth.test.js
PASS tests/empleados.test.js
PASS tests/appBootstrap.test.js
PASS tests/rbacMiddleware.test.js
PASS tests/catalogos.test.js
PASS tests/errorHandler.test.js

Test Suites: 8 passed, 8 total
Tests:       96 passed, 96 total
```

