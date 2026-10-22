// src/services/CatalogoService.js
'use strict';

class CatalogoService {
  /**
   * @param {import('../repositories/ICatalogoRepository')} catalogoRepository
   */
  constructor(catalogoRepository) {
    if (!catalogoRepository) {
      throw new Error('catalogoRepository es requerido en CatalogoService.');
    }
    this.catalogoRepository = catalogoRepository;
  }

  async listarDepartamentos() {
    return await this.catalogoRepository.obtenerDepartamentos();
  }

  async listarCategorias(idDepartamento = null) {
    if (idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== '') {
      const deptoIdNum = Number(idDepartamento);
      if (isNaN(deptoIdNum) || deptoIdNum <= 0) {
        const error = new Error('El parámetro idDepartamento debe ser un número entero válido.');
        error.statusCode = 400;
        throw error;
      }
      return await this.catalogoRepository.obtenerCategorias(deptoIdNum);
    }

    return await this.catalogoRepository.obtenerCategorias();
  }
}

module.exports = CatalogoService;
