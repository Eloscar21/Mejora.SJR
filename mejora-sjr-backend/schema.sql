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
    FotoUrl VARCHAR(255) NOT NULL,
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
