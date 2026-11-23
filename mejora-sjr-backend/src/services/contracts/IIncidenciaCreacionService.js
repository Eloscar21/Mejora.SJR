// src/services/contracts/IIncidenciaCreacionService.js
'use strict';

/** Contrato segregado para el registro de nuevas incidencias ciudadanas (ISP). */
class IIncidenciaCreacionService {
  async crearIncidencia(datos, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }
}

module.exports = IIncidenciaCreacionService;
