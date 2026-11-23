// src/services/contracts/IIncidenciaOperacionService.js
'use strict';

/** Contrato segregado para despacho, descarte y cambio de estado operativo (ISP). */
class IIncidenciaOperacionService {
  async asignarTrabajador(idIncidencia, datosTrabajador, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async descartarIncidencia(idIncidencia, datosDescarte, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async actualizarEstado(idIncidencia, datosEstado, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }
}

module.exports = IIncidenciaOperacionService;
