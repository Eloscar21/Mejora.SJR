// src/controllers/CatalogoController.js
'use strict';

class CatalogoController {
  /**
   * @param {import('../services/CatalogoService')} catalogoService
   */
  constructor(catalogoService) {
    if (!catalogoService) {
      throw new Error('catalogoService es requerido en CatalogoController.');
    }
    this.catalogoService = catalogoService;
    this.obtenerDepartamentos = this.obtenerDepartamentos.bind(this);
    this.obtenerCategorias = this.obtenerCategorias.bind(this);
  }

  async obtenerDepartamentos(req, res) {
    const departamentos = await this.catalogoService.listarDepartamentos();
    return res.status(200).json({
      success: true,
      data: departamentos
    });
  }

  async obtenerCategorias(req, res) {
    const { idDepartamento } = req.query;
    const categorias = await this.catalogoService.listarCategorias(idDepartamento);
    return res.status(200).json({
      success: true,
      data: categorias
    });
  }
}

module.exports = CatalogoController;
