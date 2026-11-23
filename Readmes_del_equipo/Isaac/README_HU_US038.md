# US-038 · Persistencia de Estado Activo/Inactivo de Categorías y Restricción Dinámica en el Formulario Ciudadano

**Responsable:** Isaac Ochoa (Backend / Integración)  
**Módulos:** `mejora-sjr-backend` & `mejora-sjr-admin`  
**Rama:** `sP7`  
**Estado:** ✅ Completado y Verificado  

---

## 1. Alcance Backend e Integración

1. **Evolución del Esquema de Datos (Azure SQL):**
   - Agregada columna `Activo BIT NOT NULL DEFAULT 1` a la tabla `Categorias`.
   - Migración idempotente en `SqlCatalogoRepository._asegurarColumnaActivo()`.

2. **Skinny Controller y Repositorios:**
   - Cumplimiento estricto del Prompt Maestro: `CatalogoController.cambiarEstado(req, res)` es 100% libre de lógica de negocio o validaciones directas.
   - Implementado `cambiarEstadoCategoria(idCategoria, activo)` en repositorios SQL y Mock.

3. **Lógica de Negocio y Seguridad RBAC (`CatalogoService.js`):**
   - `PATCH /api/catalogos/categorias/:id/estado`:
     - Rol 3 (Admin Departamental): Solo puede modificar categorías de su propio departamento (ej. Emily Ochoa en JAPAM solo modifica idDepartamento = 1).
     - Rol 4 (Superadmin): Acceso irrestricto en todos los departamentos.
     - Rol 1 y Rol 2: Acceso denegado con HTTP 403 Forbidden.
   - Filtrado inteligente en `listarCategorias`: Ciudadanos y consultas públicas solo obtienen categorías con `Activo = 1`.
   - Protección en `IncidenciaService`: Bloqueo de creación de reportes con categorías inactivas (HTTP 400).

4. **Web Admin (`CatalogoApiService.ts`):**
   - Conectado el conmutador de estado con la API remota vía `PATCH /api/catalogos/categorias/:id/estado` enviando Bearer JWT.

5. **Pruebas Automatizadas:**
   - 15 pruebas pasadas en `tests/catalogos.test.js`.
   - 242 pruebas integrales pasadas en el backend.
