# US-033 · Sincronización de Órdenes Reales para Trabajadores de Campo (Bandeja Operativa Móvil)

**Responsable:** Miguel Leal (Mobile Developer)  
**Módulo:** Aplicación Móvil (`mejora-sjr-mobile`)  
**Rama:** `sP7`  
**Estado:** ✅ Completado y Verificado  

---

## 1. Problema Resuelto

Cuando un trabajador operativo de campo (Rol 2, ej. *Luis Ángel*) iniciaba sesión en la aplicación móvil:
1. Se mostraba el aviso amarillo: *"Demostración · Solo lectura. Los datos son de ejemplo. No representan asignaciones reales del municipio."*
2. Todos los contadores de tareas mostraban 0 (*Asignadas: 0, Por atender: 0, En curso: 0*).
3. No aparecía la orden de trabajo asignada en Azure SQL (Incidencia #5 de Alumbrado Público), debido a que `BandejaProvider.tsx` instanciaba siempre el mock estático en memoria.

---

## 2. Solución e Implementación en `mejora-sjr-mobile`

### 2.1. Nuevo Servicio HTTP: `BandejaConsultaApiService.ts`
Implementa la interfaz `IBandejaConsultaService`:
- Inyecta el token Bearer del trabajador activo desde `IAuthService.obtenerToken()`.
- Consulta el endpoint `GET /api/incidencias?soloAsignadasAMi=true`.
- Transforma los registros de Azure SQL (`vw_IncidenciasDetalle`) al modelo tipado `Incidencia[]`:
  - `idIncidencia`
  - `descripcion`
  - `categoriaNombre`
  - `departamentoNombre`
  - `estadoNombre`
  - `idTrabajadorAsignado`
  - `ciudadanoNombre`
  - `fechaCreacion`
- En caso de caída de conexión, arroja una excepción legible para activar la pantalla de reintento.

### 2.2. Inyección en `BandejaProvider.tsx`
Conecta el `authService` de la sesión activa al nuevo servicio:
```tsx
const consulta = useMemo(
  () =>
    consultaService ??
    (authService ? new BandejaConsultaApiService(authService) : new MockBandejaConsultaService()),
  [consultaService, authService]
);
```

### 2.3. ViewModel `useBandejaViewModel.ts`
- Detecta si el servicio inyectado es de demostración o producción (`esDemostracion`).
- Filtra reactivamente las incidencias asignadas al `idUsuario` del token.
- Expone los contadores `totalAsignadas`, `pendientes` y `enCurso`.
- Presenta mensajes contextuales ("No tienes órdenes de trabajo asignadas a tu cuadrilla en este momento").

### 2.4. Vista `BandejaOrdenesView.tsx`
- Condiciona el banner demo: `{vm.esDemostracion && <View style={styles.demoNotice}>...}`.
- Presenta las tarjetas como `"ORDEN DE TRABAJO #X"`.
- Los botones y textos de carga se adaptan a `"Consultando órdenes"` y `"Actualizar órdenes"`.

---

## 3. Pruebas Unitarias Ejecutadas

- **`tests/bandeja-api.test.cjs`**: 5 pruebas pasando (validación de IDs, autenticación Bearer, mapeo de datos, rechazo HTTP 403 y manejo de red).
- **`tests/bandeja.test.cjs`**: 6 pruebas pasando (cálculo de filtros, exclusión de reportes ajenos, ciclo de vida del hook).
- **Chequeo TypeScript**: `npx tsc --noEmit` completado con 0 errores.
