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
    this.crearCategoria = this.crearCategoria.bind(this);
    this.actualizarCategoria = this.actualizarCategoria.bind(this);
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
    const categorias = await this.catalogoService.listarCategorias(req.query, usuarioAutenticado);
    return res.status(200).json({
      success: true,
      data: categorias
    });
  }

  /**
   * POST /api/catalogos/categorias (US-035)
   */
  async crearCategoria(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const nuevaCategoria = await this.catalogoService.crearCategoria(
      req.body,
      usuarioAutenticado
    );

    return res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente.',
      data: nuevaCategoria
    });
  }

  /**
   * PUT / PATCH /api/catalogos/categorias/:id (US-035)
   */
  async actualizarCategoria(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const actualizada = await this.catalogoService.actualizarCategoria(
      id,
      req.body,
      usuarioAutenticado
    );

    return res.status(200).json({
      success: true,
      message: 'Categoría actualizada exitosamente.',
      data: actualizada
    });
  }
}

module.exports = CatalogoController;
