// src/repositories/IUsuarioRepository.js
'use strict';

/**
 * Contrato IUsuarioRepository (ISP y DIP)
 * Define las operaciones requeridas para la persistencia de usuarios.
 */
class IUsuarioRepository {
  async buscarPorEmail(email) {
    throw new Error('Método no implementado');
  }

  async crearUsuario(datosUsuario) {
    throw new Error('Método no implementado');
  }

  async buscarPorId(idUsuario) {
    throw new Error('Método no implementado');
  }
}

module.exports = IUsuarioRepository;
