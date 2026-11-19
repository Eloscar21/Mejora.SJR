// src/controllers/PerfilController.js
'use strict';

class PerfilController {
  /**
   * @param {import('../services/PerfilService')} perfilService
   */
  constructor(perfilService) {
    if (!perfilService) {
      throw new Error('perfilService es requerido en PerfilController.');
    }
    this.perfilService = perfilService;
    this.obtener = this.obtener.bind(this);
    this.actualizar = this.actualizar.bind(this);
  }

  /**
   * GET /api/perfil (y GET /api/auth/perfil)
   */
  async obtener(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const perfil = await this.perfilService.obtenerPerfil(usuarioAutenticado);

    return res.status(200).json({
      success: true,
      message: 'Datos de perfil recuperados exitosamente.',
      data: perfil,
    });
  }

  /**
   * PUT / PATCH /api/perfil (y /api/auth/perfil)
   */
  async actualizar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { nombre, email, passwordActual, passwordNueva, confirmarPassword } = req.body || {};

    const resultado = await this.perfilService.actualizarPerfil(
      { nombre, email, passwordActual, passwordNueva, confirmarPassword },
      usuarioAutenticado
    );

    return res.status(200).json({
      success: true,
      message: resultado.mensaje,
      data: resultado.usuario,
    });
  }
}

module.exports = PerfilController;
