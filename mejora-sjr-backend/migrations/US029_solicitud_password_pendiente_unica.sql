-- US-029: aplicar únicamente sobre una base existente que ya tenga SolicitudesPassword.
-- Revisar primero el resultado de duplicados; este script no elimina ni resuelve tickets.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

IF OBJECT_ID(N'dbo.SolicitudesPassword', N'U') IS NULL
BEGIN
    THROW 50001, 'Falta dbo.SolicitudesPassword. Aplica primero el esquema de US-028.', 1;
END;

IF EXISTS (
    SELECT IdUsuario
    FROM dbo.SolicitudesPassword
    WHERE Estado = 'PENDIENTE'
    GROUP BY IdUsuario
    HAVING COUNT(*) > 1
)
BEGIN
    SELECT IdUsuario, COUNT(*) AS CantidadPendientes
    FROM dbo.SolicitudesPassword
    WHERE Estado = 'PENDIENTE'
    GROUP BY IdUsuario
    HAVING COUNT(*) > 1;

    THROW 50002, 'Hay solicitudes pendientes duplicadas. El equipo debe revisarlas antes de crear el índice.', 1;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.SolicitudesPassword')
      AND name = N'UX_SolicitudesPassword_Usuario_Pendiente'
)
BEGIN
    CREATE UNIQUE INDEX UX_SolicitudesPassword_Usuario_Pendiente
        ON dbo.SolicitudesPassword (IdUsuario)
        WHERE Estado = 'PENDIENTE';
END;
