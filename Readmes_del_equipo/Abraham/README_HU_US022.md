# Documentación Técnica: Historia de Usuario US-022
**Módulos:** Front-End Web (`mejora-sjr-admin/`) y Backend API (`mejora-sjr-backend/`)  
**Desarrollador a Cargo:** Oscar Abraham Granados  
**Rama de Entrega:** `sP4`  
**Estado:** ✅ Completado y Verificado

---

## 1. Resumen de la Historia de Usuario (US-022)
* **Identificador:** US-022
* **Objetivo:** Corregir el filtrado del DataGrid de Personal Municipal (`Todos los roles` / `Solo Inactivos`), asegurando que la tabla filtre de forma exacta basándose en la propiedad booleana `activo` (`true` / `false`) devuelta en el JSON de la API, y que los contadores de las tarjetas superiores se actualicen dinámicamente en tiempo real conforme a los filtros aplicados.

---

## 2. Causa Raíz Identificada y Solución Aplicada

1. **Exclusión de Inactivos en la Consulta de API (`GET /api/empleados`):**
   - Anteriormente, `SqlUsuarioRepository.listarEmpleadosActivos` y `MockUsuarioRepository.listarEmpleadosActivos` filtraban de manera rígida `WHERE u.Activo = 1`, provocando que el JSON devuelto al DataGrid nunca incluyera los registros con `activo: false` y que, tras desactivar un empleado, la recarga automática lo borrara de la tabla.
   - **Solución:** Se actualizó la consulta para devolver tanto empleados activos (`activo: true`) como inactivos (`activo: false`) normalizados estrictamente a tipo `boolean` en el JSON, manteniendo soporte opcional para `?soloActivos=true`.
2. **Normalización Estricta del Booleano `activo` en el Cliente:**
   - En `EmpleadoApiService.ts` (`normalizarEmpleado`) y `usePersonalTableViewModel.ts`, se garantizó que la propiedad `activo` se interprete y almacene siempre como un booleano puro (`true` / `false`).
3. **Actualización Reactiva de Contadores Superiores (`metricas`):**
   - Anteriormente, `metricas` en `usePersonalTableViewModel.ts` calculaba los totales sobre el arreglo global sin filtrar (`empleados`), dejando congeladas las tarjetas superiores al cambiar los selectores `Todos los roles` o `Solo Inactivos`.
   - **Solución:** `metricas` (`total`, `activos`, `inactivos`, `administradores`, `trabajadores`) ahora se calcula reactivamente a partir de `empleadosFiltrados`, actualizando de inmediato todas las tarjetas superiores del `PersonalDataGrid.tsx`.

---

## 3. Archivos Modificados

| Archivo | Capa | Cambio Realizado |
|---|---|---|
| `mejora-sjr-admin/src/services/api/EmpleadoApiService.ts` | Frontend - Servicio API | Normalización estricta de la propiedad booleana `activo` (`true` / `false`) e identificadores numéricos. |
| `mejora-sjr-admin/src/viewModels/usePersonalTableViewModel.ts` | Frontend - ViewModel | Filtrado por `Boolean(emp.activo)` (`activos` / `inactivos`), preservación en caché de bajas recientes y cálculo reactivo de `metricas` sobre `empleadosFiltrados`. |
| `mejora-sjr-admin/src/views/personal/PersonalDataGrid.tsx` | Frontend - Vista | Tarjetas superiores interactivas con contadores dinámicos (`Total en Vista`, `Personal Activo`, `Solo Inactivos`, `Admins Depto`, `Operativos`) y botón para limpiar filtros. |
| `mejora-sjr-backend/src/repositories/SqlUsuarioRepository.js` | Backend - Repositorio SQL | Retorno de empleados activos e inactivos con conversión explícita `activo: Boolean`. |
| `mejora-sjr-backend/src/repositories/MockUsuarioRepository.js` | Backend - Repositorio Mock | Homologación del retorno de empleados activos e inactivos con `activo: Boolean`. |
| `mejora-sjr-backend/src/services/EmpleadoService.js` | Backend - Servicio | Soporte de listado completo para el DataGrid y validación de `activo === false`. |
| `mejora-sjr-backend/tests/empleados.test.js` | Backend - Testing | Prueba automatizada verificando que tras un Soft Delete (`PATCH`), `GET /api/empleados` devuelve el empleado con `activo: false`. |

