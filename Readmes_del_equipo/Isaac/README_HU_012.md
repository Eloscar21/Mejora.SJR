# Documentación Técnica: US-012 - Integración E2E y Bloqueo de Sesión
**Módulo:** Fullstack / Backend & Integración  
**Desarrollador Responsable:** Isaac Ochoa Bocanegra  
**Rama de Entrega:** `sP2`  
**Estado:** ✅ Completado y Validado

---

## 1. Resumen de la Historia de Usuario
Integración E2E entre las interfaces de usuario (DataGrid de personal de Abraham y formularios de Miguel) y las APIs del Backend. Además, se fortaleció el endpoint de inicio de sesión (`POST /api/auth/login`) para rechazar el acceso con `401 Unauthorized` si un usuario tiene la bandera `Activo = 0` (baja lógica / soft delete).

---

## 2. Ajuste Crítico al Endpoint de Login (`AuthService.js`)

Se agregó la verificación de la bandera `Activo` inmediatamente posterior a la validación de la contraseña:

```javascript
// Regla de Negocio Crítica (US-012 / E2E):
// Bloquear acceso si el usuario ha sido desactivado (Activo = 0 o false)
if (usuario.activo === 0 || usuario.activo === false) {
  const error = new Error('Acceso denegado: El usuario se encuentra inactivo.');
  error.statusCode = 401;
  throw error;
}
```

### Comportamiento de Seguridad:
1. **Verificación Fail-Fast:** Si el usuario está dado de baja, no se emite ningún JWT token.
2. **Respuesta Estándar:** Devuelve `401 Unauthorized` con el mensaje descriptivo:
   ```json
   {
     "success": false,
     "message": "Acceso denegado: El usuario se encuentra inactivo."
   }
   ```
3. **Persistencia Multi-Fuente:** Compatible tanto con `SqlUsuarioRepository` (Azure SQL leyendo columna `Activo`) como con `MockUsuarioRepository`.

---

## 3. Integración E2E con el Frontend Web (`mejora-sjr-admin`)

Las interfaces web consumen directamente los endpoints de la API de Empleados implementados en la US-008:

1. **Consulta y Listado (`GET /api/empleados`):**
   - El componente `PersonalDataGrid` de Abraham consume `EmpleadoApiService.listarEmpleados()` enviando el token JWT.
   - El backend filtra automáticamente por departamento si el actor es Administrador de Departamento (`IdRol: 3`), o muestra todos si es Superadministrador (`IdRol: 4`).

2. **Creación (`POST /api/empleados`):**
   - El modal `CrearEmpleadoModal` de Miguel envía `nombre`, `email`, `password`, `idRol` y `idDepartamento`.
   - La API valida reglas de negocio, genera el hash con `bcrypt` y persiste el registro con `Activo = 1`.

3. **Edición (`PUT /api/empleados/:id`):**
   - El modal `EditarEmpleadoModal` de Miguel actualiza los datos del empleado respetando restricciones de departamento.

4. **Baja Lógica / Desactivación (`PATCH /api/empleados/:id`):**
   - El diálogo `DesactivarEmpleadoDialog` solicita la baja.
   - El backend ejecuta `UPDATE Usuarios SET Activo = 0 WHERE IdUsuario = @IdUsuario`.
   - El usuario queda deshabilitado en tiempo real y, gracias a la **US-012**, si intenta iniciar sesión de nuevo en la Web o App Móvil, su login será rechazado con `401`.

---

## 4. Pruebas Automatizadas
Se actualizó la suite `tests/auth.test.js` incorporando el caso de prueba para la US-012:
- `debe rechazar usuario inactivo (Activo = 0) con 401 (US-012)`: Valida status `401`, `success: false` y mensaje de bloqueo.

