// src/controllers/PasswordRecoveryController.js
'use strict';

class PasswordRecoveryController {
  /**
   * @param {import('../services/PasswordRecoveryService')} passwordRecoveryService
   */
  constructor(passwordRecoveryService) {
    if (!passwordRecoveryService) {
      throw new Error('passwordRecoveryService es requerido en PasswordRecoveryController.');
    }
    this.passwordRecoveryService = passwordRecoveryService;
    this.solicitar = this.solicitar.bind(this);
    this.listar = this.listar.bind(this);
    this.aprobar = this.aprobar.bind(this);
    this.rechazar = this.rechazar.bind(this);
  }

  async solicitar(req, res) {
    const resultado = await this.passwordRecoveryService.solicitarReseteo(req.body);
    return res.status(200).json({
      success: true,
      message: resultado.mensaje
    });
  }

  async listar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const solicitudes = await this.passwordRecoveryService.listarSolicitudes(usuarioAutenticado, req.query);
    return res.status(200).json({
      success: true,
      data: solicitudes
    });
  }

  async aprobar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.passwordRecoveryService.aprobarSolicitud(
      id,
      req.body,
      usuarioAutenticado
    );
    return res.status(200).json({
      success: true,
      message: resultado.mensaje,
      data: resultado
    });
  }

  async rechazar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.passwordRecoveryService.rechazarSolicitud(
      id,
      req.body,
      usuarioAutenticado
    );
    return res.status(200).json({
      success: true,
      message: 'Solicitud de restablecimiento rechazada.',
      data: resultado
    });
  }
}

module.exports = PasswordRecoveryController;
