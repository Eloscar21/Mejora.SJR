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
    const id = Number(idUsuario);
    const emailNormalizado = email.trim().toLowerCase();
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();

    try {
      // Serializar por la fila padre, que existe incluso si no hay ninguna solicitud hija.
      const usuarioRequest = new sql.Request(transaction);
      usuarioRequest.input('IdUsuario', sql.Int, id);
      const usuario = await usuarioRequest.query(`
        SELECT IdUsuario FROM Usuarios WITH (UPDLOCK, HOLDLOCK)
        WHERE IdUsuario = @IdUsuario;
      `);
      if (!usuario.recordset[0]) throw new Error('El usuario solicitante no existe.');

      const pendienteRequest = new sql.Request(transaction);
      pendienteRequest.input('IdUsuario', sql.Int, id);
      const pendiente = await pendienteRequest.query(`
        SELECT TOP 1 IdSolicitud AS idSolicitud, IdUsuario AS idUsuario,
          Email AS email, Estado AS estado, FechaSolicitud AS fechaSolicitud
        FROM SolicitudesPassword
        WHERE IdUsuario = @IdUsuario AND Estado = 'PENDIENTE'
        ORDER BY IdSolicitud;
      `);

      let solicitud = pendiente.recordset[0];
      if (!solicitud) {
        const request = new sql.Request(transaction);
        request.input('IdUsuario', sql.Int, id);
        request.input('Email', sql.VarChar(150), emailNormalizado);
        const result = await request.query(`
          INSERT INTO SolicitudesPassword (IdUsuario, Email, Estado, FechaSolicitud)
          OUTPUT
            INSERTED.IdSolicitud AS idSolicitud,
            INSERTED.IdUsuario AS idUsuario,
            INSERTED.Email AS email,
            INSERTED.Estado AS estado,
            INSERTED.FechaSolicitud AS fechaSolicitud
          VALUES (@IdUsuario, @Email, 'PENDIENTE', GETDATE());
        `);
        solicitud = result.recordset[0];
      }

      await transaction.commit();
      return solicitud;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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

  async resolverSolicitud(idSolicitud, { idUsuario, estado, idSuperadmin, nuevoPasswordHash, notas }) {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();

    try {
      // Mismo orden de bloqueo que crearSolicitud: usuario -> solicitud.
      const usuarioRequest = new sql.Request(transaction);
      usuarioRequest.input('IdUsuario', sql.Int, Number(idUsuario));
      const usuario = await usuarioRequest.query(`
        SELECT IdUsuario FROM Usuarios WITH (UPDLOCK, HOLDLOCK)
        WHERE IdUsuario = @IdUsuario;
      `);
      if (!usuario.recordset[0]) throw new Error('El usuario solicitante no existe.');

      // 1. Reclamar la solicitud mediante una transición condicional, no con SELECT + UPDATE.
      // La escritura mantiene el bloqueo hasta el commit/rollback de esta transacción.
      const reqUpdate = new sql.Request(transaction);
      reqUpdate.input('IdSolicitud', sql.Int, Number(idSolicitud));
      reqUpdate.input('IdUsuario', sql.Int, Number(idUsuario));
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
        WHERE IdSolicitud = @IdSolicitud AND IdUsuario = @IdUsuario AND Estado = 'PENDIENTE';
      `;

      const result = await reqUpdate.query(queryUpdate);
      const solicitud = result.recordset[0] || null;

      // 2. Solo quien obtuvo la transición puede cambiar la clave del solicitante.
      if (solicitud && estado === 'APROBADA' && nuevoPasswordHash) {
        const reqUsuario = new sql.Request(transaction);
        reqUsuario.input('IdUsuario', sql.Int, solicitud.idUsuario);
        reqUsuario.input('PasswordHash', sql.VarChar(255), nuevoPasswordHash);
        const usuarioActualizado = await reqUsuario.query(`
          UPDATE Usuarios
          SET PasswordHash = @PasswordHash
          WHERE IdUsuario = @IdUsuario;
        `);
        if (usuarioActualizado.rowsAffected[0] !== 1) {
          throw new Error('No se pudo actualizar la contraseña del solicitante.');
        }
      }

      // Sin fila reclamada no hubo cambios; al aprobar, ambas escrituras se confirman juntas.
      await transaction.commit();
      return solicitud;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = SqlSolicitudPasswordRepository;
