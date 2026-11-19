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

  async listarDepartamentos(usuarioAutenticado = null) {
    const departamentos = await this.catalogoRepository.obtenerDepartamentos();
    if (usuarioAutenticado && Number(usuarioAutenticado.idRol) === 3) {
      const deptoActor = Number(usuarioAutenticado.idDepartamento);
      return departamentos.filter((d) => Number(d.idDepartamento) === deptoActor);
    }
    return departamentos;
  }

  async listarCategorias(idDepartamento = null, usuarioAutenticado = null) {
    let deptoIdFiltrar = idDepartamento;

    // Aislamiento Departamental Estricto (US-030): Admin de Depto (Rol 3) solo ve su propia dependencia
    if (usuarioAutenticado && Number(usuarioAutenticado.idRol) === 3) {
      const deptoActor = Number(usuarioAutenticado.idDepartamento);
      if (idDepartamento && Number(idDepartamento) !== deptoActor) {
        const error = new Error('Acceso denegado: No tienes autorización para consultar o gestionar catálogos de otra dependencia.');
        error.statusCode = 403;
        throw error;
      }
      deptoIdFiltrar = deptoActor;
    }

    if (deptoIdFiltrar !== null && deptoIdFiltrar !== undefined && deptoIdFiltrar !== '') {
      const deptoIdNum = Number(deptoIdFiltrar);
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
