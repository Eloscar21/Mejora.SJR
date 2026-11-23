# US-034 · Restricción de Filtros de Rol en Personal para Administrador Departamental

**Responsable:** Isaac Ochoa (Backend / Integración)  
**Módulos:** `mejora-sjr-admin` & `mejora-sjr-backend`  
**Rama:** `sP7`  

---

## 1. Alcance de Integración para US-034

1. **Coherencia con Backend RBAC:**
   - En `mejora-sjr-backend/src/services/EmpleadoService.js`, el backend ya valida que un Administrador Departamental (Rol 3) solo pueda operar sobre empleados de Rol 2 pertenecientes a su departamento.
   - La implementación de US-034 en `mejora-sjr-admin` alinea perfectamente la capa visual y de ViewModel con las restricciones del backend:
     - Se limita el selector a Rol 2.
     - Se oculta la tarjeta métrica de Administradores de Departamento.
2. **Validación:**
   - Verificado con `personal-table.test.cjs` y compilación limpia de TypeScript.
