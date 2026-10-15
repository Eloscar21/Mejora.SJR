'use strict';
const IUsuarioRepository = require('./IUsuarioRepository');
const EmailDuplicadoError = require('../errors/EmailDuplicadoError');

class UsuarioRepository extends IUsuarioRepository {
  constructor({ getPool, sql }) {
    super();
    this.getPool = getPool;
    this.sql = sql;
  }

  async buscarPorEmail(email) {
    const pool = await this.getPool();
    const request = pool.request();
    request.input('email', this.sql.VarChar(150), email);

    const query = 'SELECT IdUsuario, Email, IdRol, IdDepartamento FROM Usuarios WHERE Email = @email';
    const result = await request.query(query);

    return result.recordset[0] || null;
  }

  async crear({ nombre, email, passwordHash, idRol, idDepartamento }) {
    try {
      const pool = await this.getPool();
      const request = pool.request();

      request.input('nombre', this.sql.VarChar(150), nombre);
      request.input('email', this.sql.VarChar(150), email);
      request.input('passwordHash', this.sql.VarChar(255), passwordHash);
      request.input('idRol', this.sql.Int, idRol);
      request.input('idDepartamento', this.sql.Int, idDepartamento);

      const query = `
        INSERT INTO Usuarios (Nombre, Email, PasswordHash, IdRol, IdDepartamento)
        OUTPUT INSERTED.IdUsuario, INSERTED.Nombre, INSERTED.Email, INSERTED.IdRol, INSERTED.IdDepartamento
        VALUES (@nombre, @email, @passwordHash, @idRol, @idDepartamento)
      `;

      const result = await request.query(query);
      return result.recordset[0];
    } catch (error) {
      if (error && (error.number === 2627 || error.number === 2601)) {
        throw new EmailDuplicadoError('El correo ya está registrado');
      }
      throw error;
    }
  }
}

module.exports = UsuarioRepository;
