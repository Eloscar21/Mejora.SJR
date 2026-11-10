# US-023: API de Creación y Persistencia de Incidencia Ciudadana

**Desarrollador Responsable:** Isaac Ochoa (Backend Developer)  
**Rama:** `sP5`  
**Historia de Usuario:** US-023  

---

## 1. Descripción del Requerimiento
Implementar el endpoint `POST /api/incidencias` para que los ciudadanos autenticados (Rol 1) puedan registrar reportes ciudadanos en el municipio de San Juan del Río. El reporte debe quedar persistido en la base de datos SQL Server (`Incidencias`), junto con su evidencia fotográfica inicial (`EvidenciasIncidencia`) de forma transaccional, extrayendo la identidad del ciudadano de forma segura mediante su token JWT (Zero-Trust).

---

## 2. Arquitectura y Componentes Implementados

### 2.1. Contrato e Implementaciones del Repositorio
- **`IIncidenciaRepository.js`**: Define el contrato formal con los métodos `crearIncidencia(datos)` y `buscarPorId(idIncidencia)`.
- **`SqlIncidenciaRepository.js`**: Implementa la persistencia en SQL Server / Azure SQL utilizando transacciones atómicas (`sql.Transaction`) para insertar simultáneamente en `Incidencias` e `EvidenciasIncidencia` (`TipoEvidencia = 'INICIAL'`).
- **`MockIncidenciaRepository.js`**: Implementación en memoria para pruebas unitarias e integración en entornos de desarrollo local sin dependencias externas.

### 2.2. Capa de Negocio (`IncidenciaService.js`)
- **Validación de Identidad & RBAC:** Exige token válido y restringe la creación de reportes exclusivamente al Rol 1 (Ciudadano).
- **Validación de Datos:**
  - `descripcion`: Mínimo 10 caracteres.
  - `idCategoria`: Debe existir en el catálogo de categorías municipal.
  - `latitud` y `longitud`: Coordenadas geográficas obligatorias y dentro de los límites geográficos válidos del Municipio de San Juan del Río.
  - `fotoUrl`: Validación opcional de formato de URL seguro.

### 2.3. Capa de Presentación (`IncidenciaController.js` y `incidenciaRoutes.js`)
- Skinny Controller sin bloques `try/catch` redundantes, delegando la captura de errores al middleware central `errorHandler`.
- Inyección de dependencias (IoC/DIP) ensamblado en `app.js` y `server.js`.

---

## 3. Pruebas Unitarias y Cobertura
Se creó la suite `tests/incidencias.test.js` con cobertura para:
1. **Control de Acceso y RBAC:** Rechazo 401 sin token y 403 para roles administrativos/trabajadores.
2. **Validación de Datos (400 Bad Request):** Descripción corta, categoría inexistente y coordenadas fuera del municipio.
3. **Creación Exitosa (201 Created):**
   - Creación básica con geolocalización y asignación de estado inicial `1` (*Recibido*).
   - Creación con fotografía de evidencia inicial (`TipoEvidencia = 'INICIAL'`).

### Resultados de Pruebas:
```powershell
PASS tests/empleadosRbac.test.js
PASS tests/incidencias.test.js
PASS tests/auth.test.js
PASS tests/empleados.test.js
PASS tests/appBootstrap.test.js
PASS tests/rbacMiddleware.test.js
PASS tests/catalogos.test.js
PASS tests/errorHandler.test.js

Test Suites: 8 passed, 8 total
Tests:       88 passed, 88 total
```
