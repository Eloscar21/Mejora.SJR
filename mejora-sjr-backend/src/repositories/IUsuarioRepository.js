'use strict';

class IUsuarioRepository {
  // Usado por el flujo de REGISTRO: verifica duplicados. No expone el hash.
  async buscarPorEmail(email) { throw new Error('No implementado'); }

  // Usado por el flujo de LOGIN: necesita el hash para comparar con bcrypt.
  // Devuelve { IdUsuario, Nombre, Email, PasswordHash, IdRol, IdDepartamento } o null.
  async buscarPorEmailConHash(email) { throw new Error('No implementado'); }

  async crear(usuario) { throw new Error('No implementado'); }

  async buscarPorId(id) { throw new Error('No implementado'); }
}

module.exports = IUsuarioRepository;
