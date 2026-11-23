# Documentación Técnica: Historia de Usuario US-035
**Módulos:** Backend (`mejora-sjr-backend/`), Web Admin (`mejora-sjr-admin/`) y App Móvil (`mejora-sjr-mobile/`)  
**Responsable:** Isaac Ochoa (Backend / Integración)  
**Rama de Entrega:** `sP7`  
**Estado:** ✅ Completado y Verificado

---

## 1. Alcance de Backend para US-035

1. **Implementación de `SqlCatalogoRepository.js`:**
   - Inserciones parametrizadas en la tabla `Categorias` (`Nombre`, `IdDepartamento`).
   - Mapeo con la tabla `Departamentos` (`d.Nombre AS departamentoNombre`).
2. **Inyección en `server.js`:**
   - Se inyecta `SqlCatalogoRepository` cuando `DATA_SOURCE='azure_sql'` en lugar de mock.
3. **Controlador y Rutas RBAC:**
   - `POST /api/catalogos/categorias` protegido para Roles 3 y 4 con validación estricta de pertenencia departamental.
