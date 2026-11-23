// src/services/contracts/IEmpleadoService.js
'use strict';

class IEmpleadoService {
  async listarEmpleados(usuarioAutenticado, filtros) {
    throw new Error('Método no implementado');
  }

  async crearEmpleado(datosEmpleado, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async actualizarEmpleado(idUsuario, datosActualizacion, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async cambiarEstadoEmpleado(idUsuario, activo, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }
}

module.exports = IEmpleadoService;
