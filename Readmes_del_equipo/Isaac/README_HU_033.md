# US-033 · Sincronización de Órdenes Reales para Trabajadores de Campo (Bandeja Operativa Móvil)

**Responsable:** Isaac Ochoa (Backend / Integración)  
**Módulos:** `mejora-sjr-backend` & `mejora-sjr-mobile`  
**Rama:** `sP7`  

---

## 1. Alcance de Backend para US-033

Para dar soporte a la consulta de órdenes asignadas a trabajadores de campo desde la app móvil:

1. **Aislamiento RBAC en `IncidenciaService.js`:**
   - Para usuarios con `idRol === 2` (Trabajador de campo), `listarIncidencias` aplica:
     - `queryFiltros.idDepartamento = deptoToken` (Aislamiento por dependencia).
     - Si `filtros.soloAsignadasAMi === true`, se inyecta `queryFiltros.idTrabajadorAsignado = usuarioAutenticado.idUsuario`.
2. **Repositorio `SqlIncidenciaRepository.js`:**
   - La consulta SQL parametriza `@IdTrabajadorAsignado` sobre la vista `vw_IncidenciasDetalle`.
   - Garantiza que el trabajador solo reciba incidencias que fueron asignadas a su identificador municipal.
3. **Consumo Móvil:**
   - Se validó la integración entre `BandejaConsultaApiService.ts` y el endpoint `GET /api/incidencias?soloAsignadasAMi=true` con token Bearer JWT.

---

## 2. Verificación de Integración

- Incidencia #5 asignada a Luis Ángel (`IdTrabajadorAsignado = 17`, Alumbrado, Servicios Públicos).
- Verificación de contrato con `bandeja-api.test.cjs` y pruebas automáticas aprobadas.
