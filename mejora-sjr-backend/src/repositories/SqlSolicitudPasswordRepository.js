// src/repositories/SqlSolicitudPasswordRepository.js
'use strict';

const sql = require('mssql');
const ISolicitudPasswordRepository = require('./ISolicitudPasswordRepository');

/**
 * Implementación de ISolicitudPasswordRepository para Azure SQL Server
 * Conforme a US-028: Gestión de solicitudes asistidas de restablecimiento de contraseña.
 */
class SqlSolicitudPasswordRepository extends ISolicitudPasswordRepository {
  /**
   * @param {sql.ConnectionPool} pool
   */
  constructor(pool) {
    super();
    if (!pool) {
      throw new Error('ConnectionPool es requerido en SqlSolicitudPasswordRepository.');
    }
    this.pool = pool;
  }

  async crearSolicitud({ idUsuario, email }) {
    const request = this.pool.request();
    request.input('IdUsuario', sql.Int, Number(idUsuario));
    request.input('Email', sql.VarChar(150), email.trim().toLowerCase());

    const query = `
      INSERT INTO SolicitudesPassword (IdUsuario, Email, Estado, FechaSolicitud)
      OUTPUT 
        INSERTED.IdSolicitud AS idSolicitud,
        INSERTED.IdUsuario AS idUsuario,
        INSERTED.Email AS email,
        INSERTED.Estado AS estado,
        INSERTED.FechaSolicitud AS fechaSolicitud
      VALUES (@IdUsuario, @Email, 'PENDIENTE', GETDATE());
    `;

    const result = await request.query(query);
    return result.recordset[0];
  }

  async listarSolicitudes(estado) {
    const request = this.pool.request();
    let query = `
      SELECT 
        s.IdSolicitud AS idSolicitud,
        s.IdUsuario AS idUsuario,
        u.Nombre AS nombreUsuario,
        s.Email AS email,
        u.IdRol AS idRol,
        r.Nombre AS rolNombre,
        u.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        s.Estado AS estado,
        s.FechaSolicitud AS fechaSolicitud,
        s.FechaResolucion AS fechaResolucion,
        s.IdSuperadminResolutor AS idSuperadminResolutor,
        sup.Nombre AS superadminNombre,
        s.NotasResolucion AS notasResolucion
      FROM SolicitudesPassword s
      INNER JOIN Usuarios u ON s.IdUsuario = u.IdUsuario
      INNER JOIN Roles r ON u.IdRol = r.IdRol
      LEFT JOIN Departamentos d ON u.IdDepartamento = d.IdDepartamento
      LEFT JOIN Usuarios sup ON s.IdSuperadminResolutor = sup.IdUsuario
      WHERE 1 = 1
    `;

    if (estado) {
      request.input('Estado', sql.VarChar(20), estado.trim().toUpperCase());
      query += ` AND s.Estado = @Estado`;
    }

    query += ` ORDER BY s.FechaSolicitud DESC;`;

    const result = await request.query(query);
    return result.recordset;
  }

  async buscarPorId(idSolicitud) {
    const request = this.pool.request();
    request.input('IdSolicitud', sql.Int, Number(idSolicitud));

    const query = `
      SELECT 
        s.IdSolicitud AS idSolicitud,
        s.IdUsuario AS idUsuario,
        u.Nombre AS nombreUsuario,
        s.Email AS email,
        u.IdRol AS idRol,
        r.Nombre AS rolNombre,
        u.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        s.Estado AS estado,
        s.FechaSolicitud AS fechaSolicitud,
        s.FechaResolucion AS fechaResolucion,
        s.IdSuperadminResolutor AS idSuperadminResolutor,
        s.NotasResolucion AS notasResolucion
      FROM SolicitudesPassword s
      INNER JOIN Usuarios u ON s.IdUsuario = u.IdUsuario
      INNER JOIN Roles r ON u.IdRol = r.IdRol
      LEFT JOIN Departamentos d ON u.IdDepartamento = d.IdDepartamento
      WHERE s.IdSolicitud = @IdSolicitud;
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  }

  async resolverSolicitud(idSolicitud, { estado, idSuperadmin, nuevoPasswordHash, notas }) {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();

    try {
      // 1. Obtener solicitud para saber qué usuario afectará
      const reqBuscar = new sql.Request(transaction);
      reqBuscar.input('IdSolicitud', sql.Int, Number(idSolicitud));
      const resSolicitud = await reqBuscar.query(`SELECT IdUsuario FROM SolicitudesPassword WHERE IdSolicitud = @IdSolicitud`);
      if (!resSolicitud.recordset[0]) {
        throw new Error('Solicitud no encontrada.');
      }
      const idUsuario = resSolicitud.recordset[0].IdUsuario;

      // 2. Si es APROBADA y viene nuevoPasswordHash, actualizar contraseña del usuario
      if (estado === 'APROBADA' && nuevoPasswordHash) {
        const reqUsuario = new sql.Request(transaction);
        reqUsuario.input('IdUsuario', sql.Int, idUsuario);
        reqUsuario.input('PasswordHash', sql.VarChar(255), nuevoPasswordHash);
        await reqUsuario.query(`
          UPDATE Usuarios 
          SET PasswordHash = @PasswordHash
          WHERE IdUsuario = @IdUsuario;
        `);
      }

      // 3. Actualizar estado de la solicitud
      const reqUpdate = new sql.Request(transaction);
      reqUpdate.input('IdSolicitud', sql.Int, Number(idSolicitud));
      reqUpdate.input('Estado', sql.VarChar(20), estado.toUpperCase());
      reqUpdate.input('IdSuperadmin', sql.Int, Number(idSuperadmin));
      reqUpdate.input('Notas', sql.VarChar(255), notas ? notas.trim() : null);

      const queryUpdate = `
        UPDATE SolicitudesPassword
        SET 
          Estado = @Estado,
          FechaResolucion = GETDATE(),
          IdSuperadminResolutor = @IdSuperadmin,
          NotasResolucion = @Notas
        OUTPUT 
          INSERTED.IdSolicitud AS idSolicitud,
          INSERTED.IdUsuario AS idUsuario,
          INSERTED.Email AS email,
          INSERTED.Estado AS estado,
          INSERTED.FechaSolicitud AS fechaSolicitud,
          INSERTED.FechaResolucion AS fechaResolucion,
          INSERTED.IdSuperadminResolutor AS idSuperadminResolutor,
          INSERTED.NotasResolucion AS notasResolucion
        WHERE IdSolicitud = @IdSolicitud;
      `;

      const result = await reqUpdate.query(queryUpdate);
      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = SqlSolicitudPasswordRepository;
