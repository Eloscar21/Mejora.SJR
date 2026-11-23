# US-038 · Persistencia de Estado Activo/Inactivo de Categorías y Restricción Dinámica en el Formulario Ciudadano

**Responsable:** Miguel Leal (Mobile Developer)  
**Módulo:** Aplicación Móvil (`mejora-sjr-mobile`)  
**Rama:** `sP7`  
**Estado:** ✅ Completado y Verificado  

---

## 1. Alcance Móvil

1. **Tipado y Mapeo de Categorías:**
   - Se extendió la interfaz `Categoria` en `src/models/catalogo.types.ts` con la propiedad opcional `activo?: boolean`.
   - `CatalogoApiService.ts` mapea la propiedad `activo: c.activo !== false` en las respuestas de la API.

2. **Filtrado Reactivo en Formulario Ciudadano (`useReporteViewModel.ts`):**
   - El selector de categorías (`categoriasItems`) ahora filtra automáticamente excluyendo cualquier categoría cuyo estado sea inactivo (`cat.activo !== false`).
   - El subtítulo dinámico del formulario ahora refleja con exactitud el conteo de categorías disponibles (ej. cambia de "3 categorías disponibles" a "2 categorías disponibles" cuando se desactiva "Pozo de agua").
   - En caso de que una categoría se desactive mientras el usuario tiene el formulario abierto, la validación de envío (`enviarReporte`) previene el envío y notifica al usuario que la categoría ya no está disponible.

3. **Pruebas Automatizadas:**
   - Verificado con `us035-propagacion-categorias.test.cjs` (2 de 2 pruebas aprobadas).
   - Verificado con `reporte-form.test.cjs` (29 de 29 pruebas aprobadas).
   - TypeScript check limpio con 0 errores.
