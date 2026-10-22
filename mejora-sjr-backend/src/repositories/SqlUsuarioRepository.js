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
        IdDepartamento AS idDepartamento
      FROM Usuarios
      WHERE LOWER(Email) = LOWER(@Email)
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  }

  async crearUsuario({ nombre, email, passwordHash, idRol, idDepartamento }) {
    const request = this.pool.request();
    request.input('Nombre', sql.VarChar(150), nombre.trim());
    request.input('Email', sql.VarChar(150), email.trim().toLowerCase());
    request.input('PasswordHash', sql.VarChar(255), passwordHash);
    request.input('IdRol', sql.Int, idRol);
    request.input('IdDepartamento', sql.Int, idDepartamento || null);

    const query = `
      INSERT INTO Usuarios (Nombre, Email, PasswordHash, IdRol, IdDepartamento)
      OUTPUT 
        INSERTED.IdUsuario AS idUsuario,
        INSERTED.Nombre AS nombre,
        INSERTED.Email AS email,
        INSERTED.IdRol AS idRol,
        INSERTED.IdDepartamento AS idDepartamento
      VALUES (@Nombre, @Email, @PasswordHash, @IdRol, @IdDepartamento)
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
        IdDepartamento AS idDepartamento
      FROM Usuarios
      WHERE IdUsuario = @IdUsuario
    `;

    const result = await request.query(query);
    return result.recordset[0] || null;
  }
}

module.exports = SqlUsuarioRepository;
