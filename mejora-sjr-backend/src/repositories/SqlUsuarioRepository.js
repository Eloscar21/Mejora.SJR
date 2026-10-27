// src/repositories/SqlUsuarioRepository.js
'use strict';

const sql = require('mssql');
const IUsuarioRepository = require('./IUsuarioRepository');

class SqlUsuarioRepository extends IUsuarioRepository {
  /**
   * @param {import('mssql').ConnectionPool} pool - Pool de conexiones inyectado (DIP)
   */
  constructor(pool) {
    super();
    if (!pool) {
      throw new Error('ConnectionPool es requerido en SqlUsuarioRepository.');
    }
    this.pool = pool;
  }

  async buscarPorEmail(email) {
    if (!email) return null;

    const request = this.pool.request();
    request.input('Email', sql.VarChar(150), email.trim().toLowerCase());

    const query = `
      SELECT TOP 1 
        IdUsuario AS idUsuario,
        Nombre AS nombre,
        Email AS email,
        PasswordHash AS passwordHash,
        IdRol AS idRol,
        IdDepartamento AS idDepartamento,
        Activo AS activo
      FROM Usuarios
      WHERE LOWER(Email) = LOWER(@Email)
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  }

  async crearUsuario({ nombre, email, passwordHash, idRol, idDepartamento, activo = 1 }) {
    const request = this.pool.request();
    request.input('Nombre', sql.VarChar(150), nombre.trim());
    request.input('Email', sql.VarChar(150), email.trim().toLowerCase());
    request.input('PasswordHash', sql.VarChar(255), passwordHash);
    request.input('IdRol', sql.Int, idRol);
    request.input('IdDepartamento', sql.Int, idDepartamento || null);
    request.input('Activo', sql.Bit, activo !== undefined ? (activo ? 1 : 0) : 1);

    const query = `
      INSERT INTO Usuarios (Nombre, Email, PasswordHash, IdRol, IdDepartamento, Activo)
      OUTPUT 
        INSERTED.IdUsuario AS idUsuario,
        INSERTED.Nombre AS nombre,
        INSERTED.Email AS email,
        INSERTED.IdRol AS idRol,
        INSERTED.IdDepartamento AS idDepartamento,
        INSERTED.Activo AS activo
      VALUES (@Nombre, @Email, @PasswordHash, @IdRol, @IdDepartamento, @Activo)
    `;

    const result = await request.query(query);
    return result.recordset[0];
  }

  async buscarPorId(idUsuario) {
    const request = this.pool.request();
    request.input('IdUsuario', sql.Int, Number(idUsuario));

    const query = `
      SELECT TOP 1 
        IdUsuario AS idUsuario,
        Nombre AS nombre,
        Email AS email,
        IdRol AS idRol,
        IdDepartamento AS idDepartamento,
        Activo AS activo
      FROM Usuarios
      WHERE IdUsuario = @IdUsuario
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  }

  async listarEmpleadosActivos({ roles = [2, 3], idDepartamento } = {}) {
    const request = this.pool.request();
    let query = `
      SELECT 
        u.IdUsuario AS idUsuario,
        u.Nombre AS nombre,
        u.Email AS email,
        u.IdRol AS idRol,
        r.Nombre AS rolNombre,
        u.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        u.Activo AS activo
      FROM Usuarios u
      INNER JOIN Roles r ON u.IdRol = r.IdRol
      LEFT JOIN Departamentos d ON u.IdDepartamento = d.IdDepartamento
      WHERE u.Activo = 1
        AND u.IdRol IN (${roles.map(r => Number(r)).join(',')})
    `;

    if (idDepartamento) {
      request.input('IdDepartamento', sql.Int, Number(idDepartamento));
      query += ` AND u.IdDepartamento = @IdDepartamento`;
    }

    query += ` ORDER BY u.Nombre ASC`;

    const result = await request.query(query);
    return result.recordset;
  }

  async actualizarEmpleado(idUsuario, { nombre, idRol, idDepartamento }) {
    const request = this.pool.request();
    request.input('IdUsuario', sql.Int, Number(idUsuario));
    request.input('Nombre', sql.VarChar(150), nombre.trim());
    request.input('IdRol', sql.Int, Number(idRol));
    request.input('IdDepartamento', sql.Int, idDepartamento ? Number(idDepartamento) : null);

    const query = `
      UPDATE Usuarios
      SET 
        Nombre = @Nombre,
        IdRol = @IdRol,
        IdDepartamento = @IdDepartamento
      OUTPUT 
        INSERTED.IdUsuario AS idUsuario,
        INSERTED.Nombre AS nombre,
        INSERTED.Email AS email,
        INSERTED.IdRol AS idRol,
        INSERTED.IdDepartamento AS idDepartamento,
        INSERTED.Activo AS activo
      WHERE IdUsuario = @IdUsuario
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  }

  async desactivarEmpleado(idUsuario) {
    const request = this.pool.request();
    request.input('IdUsuario', sql.Int, Number(idUsuario));

    const query = `
      UPDATE Usuarios
      SET Activo = 0
      WHERE IdUsuario = @IdUsuario AND Activo = 1
    `;

    const result = await request.query(query);
    return result.rowsAffected[0] > 0;
  }
}

module.exports = SqlUsuarioRepository;
