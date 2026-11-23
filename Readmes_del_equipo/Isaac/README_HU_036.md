# US-036 · Interacción Operativa en Campo: Visualización de Evidencias Fotográficas y Cambio de Estado de Incidencias

**Responsable:** Isaac Ochoa (Backend / Integración)  
**Módulos:** `mejora-sjr-backend` & `mejora-sjr-mobile`  
**Rama:** `sP7`  
**Estado:** ✅ Completado y Verificado  

---

## 1. Alcance Backend e Integración

1. **Endpoint `PATCH /api/incidencias/:id/estado`:**
   - RBAC con `authorizeRoles(2, 3, 4)`.
   - Si el actor es Rol 2 (Trabajador de campo), valida que la incidencia esté asignada a él (`IdTrabajadorAsignado === idUsuarioToken`).
   - Si es Rol 3 (Admin departamental), valida que pertenezca a su secretaría.
   - Si es Rol 4 (Superadmin), permite actualización global.
2. **Persistencia Azure SQL:**
   - `UPDATE Incidencias SET IdEstado = @NuevoEstado, FechaActualizacion = GETDATE()`.
3. **Pruebas:**
   - 22 pruebas aprobadas en `tests/incidencias.test.js`.
