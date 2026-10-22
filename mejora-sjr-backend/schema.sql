-- schema.sql
-- Archivo DDL Maestro para Mejora SJR (Azure SQL)

-- BLOQUE 1: CATÁLOGOS Y ESTRUCTURAS BASE
CREATE TABLE Roles (
    IdRol INT PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Departamentos (
    IdDepartamento INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Estados (
    IdEstado INT PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Categorias (
    IdCategoria INT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    IdDepartamento INT NOT NULL,
    CONSTRAINT FK_Categorias_Departamentos FOREIGN KEY (IdDepartamento) 
        REFERENCES Departamentos(IdDepartamento)
);

-- Inserciones Semilla
INSERT INTO Roles (IdRol, Nombre) VALUES (1, 'Ciudadano'), (2, 'Trabajador'), (3, 'Admin'), (4, 'Superadmin');
INSERT INTO Departamentos (IdDepartamento, Nombre) VALUES (1, 'JAPAM'), (2, 'Servicios Públicos');
INSERT INTO Estados (IdEstado, Nombre) VALUES (1, 'Recibido'), (2, 'En Revisión'), (3, 'En Progreso'), (4, 'Atendido'), (5, 'Rechazado');
INSERT INTO Categorias (IdCategoria, Nombre, IdDepartamento) VALUES (1, 'Fugas de agua', 1), (2, 'Alcantarillado', 1), (3, 'Alumbrado', 2), (4, 'Bacheo', 2);


-- BLOQUE 2: USUARIOS E INCIDENCIAS
CREATE TABLE Usuarios (
    IdUsuario INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(150) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    IdRol INT NOT NULL,
    IdDepartamento INT NULL, -- NULL si es Ciudadano o Superadmin
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (IdRol) REFERENCES Roles(IdRol),
    CONSTRAINT FK_Usuarios_Departamentos FOREIGN KEY (IdDepartamento) REFERENCES Departamentos(IdDepartamento),
    
    -- Regla de Negocio Protegida a Nivel de Base de Datos
    CONSTRAINT CHK_Usuario_Depto CHECK (
        (IdRol IN (2, 3) AND IdDepartamento IS NOT NULL) OR 
        (IdRol IN (1, 4) AND IdDepartamento IS NULL)
    )
);

CREATE TABLE Incidencias (
    IdIncidencia INT IDENTITY(1,1) PRIMARY KEY,
    Descripcion NVARCHAR(MAX) NOT NULL,
    Latitud DECIMAL(10, 8) NOT NULL,
    Longitud DECIMAL(11, 8) NOT NULL,
    IdUsuario INT NOT NULL, -- El Ciudadano que reporta
    IdCategoria INT NOT NULL,
    IdEstado INT NOT NULL DEFAULT 1, -- 1 = Recibido por defecto
    IdTrabajadorAsignado INT NULL, -- El trabajador de campo asignado
    FechaCreacion DATETIME NOT NULL DEFAULT GETDATE(),
    FechaActualizacion DATETIME NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_Incidencias_Usuarios FOREIGN KEY (IdUsuario) REFERENCES Usuarios(IdUsuario),
    CONSTRAINT FK_Incidencias_Categorias FOREIGN KEY (IdCategoria) REFERENCES Categorias(IdCategoria),
    CONSTRAINT FK_Incidencias_Estados FOREIGN KEY (IdEstado) REFERENCES Estados(IdEstado),
    CONSTRAINT FK_Incidencias_Trabajador FOREIGN KEY (IdTrabajadorAsignado) REFERENCES Usuarios(IdUsuario)
);

CREATE TABLE EvidenciasIncidencia (
    IdEvidencia INT IDENTITY(1,1) PRIMARY KEY,
    IdIncidencia INT NOT NULL,
    IdUsuario INT NOT NULL, -- Quién sube la evidencia (Ciudadano o Trabajador)
    TipoEvidencia VARCHAR(20) NOT NULL, -- 'INICIAL', 'RESOLUCION', 'PROCESO'
    FotoUrl VARCHAR(255) NOT NULL,
    FechaSubida DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Evidencias_Incidencia FOREIGN KEY (IdIncidencia) REFERENCES Incidencias(IdIncidencia) ON DELETE CASCADE,
    CONSTRAINT FK_Evidencias_Usuario FOREIGN KEY (IdUsuario) REFERENCES Usuarios(IdUsuario),
    CONSTRAINT CHK_TipoEvidencia CHECK (TipoEvidencia IN ('INICIAL', 'RESOLUCION', 'PROCESO'))
);

GO

-- VISTA DE CONSULTA DESNORMALIZADA (CQRS Lectura Ligera)
CREATE VIEW vw_IncidenciasDetalle AS
SELECT 
    i.IdIncidencia,
    i.Descripcion,
    i.Latitud,
    i.Longitud,
    i.FechaCreacion,
    i.FechaActualizacion,
    i.IdEstado,
    e.Nombre AS Estado,
    i.IdCategoria,
    c.Nombre AS Categoria,
    c.IdDepartamento,
    d.Nombre AS Departamento,
    i.IdUsuario AS IdCiudadano,
    u.Nombre AS CiudadanoNombre,
    i.IdTrabajadorAsignado,
    t.Nombre AS TrabajadorNombre,
    (SELECT TOP 1 FotoUrl FROM EvidenciasIncidencia WHERE IdIncidencia = i.IdIncidencia AND TipoEvidencia = 'INICIAL' ORDER BY FechaSubida ASC) AS FotoInicialUrl,
    (SELECT TOP 1 FotoUrl FROM EvidenciasIncidencia WHERE IdIncidencia = i.IdIncidencia AND TipoEvidencia = 'RESOLUCION' ORDER BY FechaSubida DESC) AS FotoResolucionUrl
FROM Incidencias i
INNER JOIN Estados e ON i.IdEstado = e.IdEstado
INNER JOIN Categorias c ON i.IdCategoria = c.IdCategoria
INNER JOIN Departamentos d ON c.IdDepartamento = d.IdDepartamento
INNER JOIN Usuarios u ON i.IdUsuario = u.IdUsuario
LEFT JOIN Usuarios t ON i.IdTrabajadorAsignado = t.IdUsuario;

