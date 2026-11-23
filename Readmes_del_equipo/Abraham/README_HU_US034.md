# US-034 · Restricción de Filtros de Rol en Personal para Administrador Departamental

**Responsables:** Oscar Abraham Granados (Frontend Web Admin)  
**Módulo:** Web Administrativa (`mejora-sjr-admin`)  
**Rama:** `sP7`  
**Estado:** ✅ Completado y Verificado  

---

## 1. Problema Atendido

En la pantalla de personal municipal (`/admin/personal`), cuando iniciaba sesión un Administrador de Departamento (Rol 3, e.g. *Emily Ochoa*):
- En el combo desplegable de roles se mostraban las opciones "Rol 2" y "Rol 3".
- Como administrador departamental solo le corresponde supervisar y gestionar a trabajadores de campo (Rol 2) de su departamento, por lo que la opción de Rol 3 resultaba incoherente.
- Asimismo, la tarjeta de estadísticas "Admins Depto (Rol 3)" no tenía sentido en su vista.

---

## 2. Cambios en Frontend Web (`mejora-sjr-admin`)

1. **`usePersonalTableViewModel.ts`:**
   - Si `idRolActor === 3`, `filtroRol` se inicializa directamente en `2`.
   - La función `cambiarFiltroRol` descarta cualquier intento de seleccionar un rol distinto a `2`.
   - `limpiarFiltros` restablece el filtro a `2` para Rol 3 y a `'todos'` para Superadministrador.

2. **`PersonalDataGrid.tsx`:**
   - El `<select id={rolSelectId}>` renderiza de forma condicional:
     - Rol 3: Únicamente `<option value="2">Rol 2 - Trabajador de Campo</option>`.
     - Superadministrador: Mantiene todas las opciones (`todos`, `2`, `3`).
   - La tarjeta KPI *"Admins Depto (Rol 3)"* se oculta cuando el usuario no es Superadmin (`!esSuperadmin`).
   - La grilla métrica superior ajusta sus columnas a `grid-cols-2 md:grid-cols-4 lg:grid-cols-4` para mantener un balance visual simétrico.

---

## 3. Pruebas Unitarias

- **`tests/personal-table.test.cjs`**: 24 aserciones pasando al 100%.
- **TypeScript**: `npx tsc --noEmit` completado con 0 errores.
