// src/controllers/PasswordRecoveryController.js
'use strict';

/**
 * PasswordRecoveryController (Skinny Controller)
 * Flujo asistido de reseteo de contraseñas (US-028)
 */
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

  /**
   * POST /api/auth/recuperar-password (Público)
   */
  async solicitar(req, res) {
    const { email } = req.body;
    const resultado = await this.passwordRecoveryService.solicitarReseteo(email);
    return res.status(200).json({
      success: true,
      message: resultado.mensaje
    });
  }

  /**
   * GET /api/solicitudes-password (Superadmin Rol 4)
   */
  async listar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { estado } = req.query;
    const solicitudes = await this.passwordRecoveryService.listarSolicitudes(usuarioAutenticado, estado);
    return res.status(200).json({
      success: true,
      message: 'Solicitudes de contraseña recuperadas exitosamente.',
      data: solicitudes
    });
  }

  /**
   * PATCH /api/solicitudes-password/:id/aprobar (Superadmin Rol 4)
   */
  async aprobar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const { passwordProvisional, notas } = req.body;

    const resultado = await this.passwordRecoveryService.aprobarSolicitud(
      id,
      { passwordProvisional, notas },
      usuarioAutenticado
    );

    return res.status(200).json({
      success: true,
      message: resultado.mensaje,
      data: resultado
    });
  }

  /**
   * PATCH /api/solicitudes-password/:id/rechazar (Superadmin Rol 4)
   */
  async rechazar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const { motivo } = req.body;

    const resultado = await this.passwordRecoveryService.rechazarSolicitud(
      id,
      { motivo },
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
