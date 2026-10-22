// src/repositories/ICatalogoRepository.js
'use strict';

/**
 * Contrato ICatalogoRepository (ISP y DIP)
 * Define las operaciones requeridas para la consulta de catálogos base.
 */
class ICatalogoRepository {
  async obtenerDepartamentos() {
    throw new Error('Método no implementado');
  }

  async obtenerCategorias(idDepartamento = null) {
    throw new Error('Método no implementado');
  }
}

module.exports = ICatalogoRepository;
