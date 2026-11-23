// src/repositories/ICatalogoRepository.js
'use strict';

/**
 * Contrato ICatalogoRepository (ISP y DIP)
 * Define las operaciones requeridas para la consulta y persistencia de catálogos municipales (US-002 / US-035).
 */
class ICatalogoRepository {
  async obtenerDepartamentos() {
    throw new Error('Método no implementado');
  }

  async obtenerCategorias(idDepartamento = null) {
    throw new Error('Método no implementado');
  }

  async crearCategoria(datosCategoria) {
    throw new Error('Método no implementado');
  }

  async actualizarCategoria(idCategoria, datosCategoria) {
    throw new Error('Método no implementado');
  }
}

module.exports = ICatalogoRepository;
