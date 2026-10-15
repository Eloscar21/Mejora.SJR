# Historia de Usuario: Diseño de Esquema de Base de Datos (Azure SQL)
**Desarrollador:** Isaac

## Resumen
Se generó el DDL maestro para la plataforma "Mejora SJR" (`schema.sql`), estableciendo las restricciones estructurales a nivel de base de datos para garantizar la integridad referencial y aislar operativamente los departamentos.

## Arquitectura y Principios Aplicados
* **Tercera Forma Normal (3NF) y SSOT:** Se evitó la redundancia al no incluir `IdDepartamento` en la tabla `Incidencias`. El departamento al que pertenece un reporte se infiere estrictamente a través de su `IdCategoria`, previniendo anomalías de actualización.
* **Integridad a nivel de Motor (Defensa en Profundidad):** Se implementó un `CONSTRAINT CHK_Usuario_Depto` en la tabla de `Usuarios` para que la propia base de datos rechace transacciones que intenten crear Trabajadores/Admins sin departamento, o Ciudadanos con un departamento asignado.

## Diagrama de Entidad-Relación (Mermaid)

```mermaid
erDiagram
    Departamentos ||--o{ Categorias : "asigna dueños a"
    Departamentos ||--o{ Usuarios : "emplea a (Trabajador/Admin)"
    Roles ||--o{ Usuarios : "define el perfil de"
    
    Usuarios ||--o{ Incidencias : "reporta (Ciudadano)"
    Usuarios ||--o{ Incidencias : "atiende (Trabajador)"
    Categorias ||--o{ Incidencias : "clasifica el problema de"
    Estados ||--o{ Incidencias : "controla el estado de"

    Departamentos {
        int IdDepartamento PK
        varchar Nombre
    }
    Roles {
        int IdRol PK
        varchar Nombre
    }
    Estados {
        int IdEstado PK
        varchar Nombre
    }
    Categorias {
        int IdCategoria PK
        varchar Nombre
        int IdDepartamento FK "Obligatorio"
    }
    Usuarios {
        int IdUsuario PK
        varchar Nombre
        varchar Email
        varchar PasswordHash
        int IdRol FK
        int IdDepartamento FK "Condicional por CHECK"
    }
    Incidencias {
        int IdIncidencia PK
        nvarchar Descripcion
        decimal Latitud
        decimal Longitud
        varchar FotoUrl
        int IdUsuario FK "Dueño (Ciudadano)"
        int IdCategoria FK
        int IdEstado FK "Default: 1 (Recibido)"
        int IdTrabajadorAsignado FK "Asignado a (Trabajador)"
        datetime FechaCreacion
    }
```

## Estructura de Inyección y Flujo de Consultas (Backend)
Cuando se construyan los repositorios (`ReporteRepository`), la regla arquitectónica establecida para filtrar datos en el Dashboard Web es:
* El Controlador extraerá el `IdDepartamento` del JWT del Administrador logueado.
* El Repositorio ejecutará un `INNER JOIN` entre `Incidencias`, `Categorias` y `Departamentos`, filtrando por el departamento inyectado.
* Prohibido hacer consultas múltiples; el motor relacional debe resolverlo en un solo plan de ejecución.
