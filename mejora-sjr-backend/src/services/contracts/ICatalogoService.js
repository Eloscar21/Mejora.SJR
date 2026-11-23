// src/services/contracts/ICatalogoService.js
'use strict';

class ICatalogoService {
  async listarDepartamentos(usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async listarCategorias(filtrosOId, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async crearCategoria(datosCategoria, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async actualizarCategoria(idCategoria, datosCategoria, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async cambiarEstadoCategoria(idCategoria, datosEstado, usuarioAutenticado) {
    throw new Error('Método no implementado');
  }
}

module.exports = ICatalogoService;
