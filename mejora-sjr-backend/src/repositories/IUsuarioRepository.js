'use strict';

class IUsuarioRepository {
  async buscarPorEmail(email) { throw new Error('No implementado'); }
  async crear(usuario) { throw new Error('No implementado'); }
}

module.exports = IUsuarioRepository;
