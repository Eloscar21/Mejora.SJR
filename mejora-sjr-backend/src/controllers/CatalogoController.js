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
    const usuarioAutenticado = req.usuario || req.user;
    const departamentos = await this.catalogoService.listarDepartamentos(usuarioAutenticado);
    return res.status(200).json({
      success: true,
      data: departamentos
    });
  }

  async obtenerCategorias(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { idDepartamento } = req.query;
    const categorias = await this.catalogoService.listarCategorias(idDepartamento, usuarioAutenticado);
    return res.status(200).json({
      success: true,
      data: categorias
    });
  }
}

module.exports = CatalogoController;
