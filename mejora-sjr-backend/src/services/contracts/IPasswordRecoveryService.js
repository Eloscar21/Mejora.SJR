// src/services/contracts/IPasswordRecoveryService.js
'use strict';

class IPasswordRecoveryService {
  async solicitarRecuperacion(email) {
    throw new Error('Método no implementado');
  }

  async listarSolicitudes(usuarioAutenticado, filtros) {
    throw new Error('Método no implementado');
  }

  async aprobarSolicitud(idSolicitud, notas, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async rechazarSolicitud(idSolicitud, notas, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }
}

module.exports = IPasswordRecoveryService;
