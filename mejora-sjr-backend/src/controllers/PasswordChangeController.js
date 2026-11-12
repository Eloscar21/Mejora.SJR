'use strict';

class PasswordChangeController {
  /** @param {import('../services/contracts/IPasswordChangeService')} passwordChangeService */
  constructor(passwordChangeService) {
    if (!passwordChangeService) {
      throw new Error('passwordChangeService es requerido en PasswordChangeController.');
    }
    this.passwordChangeService = passwordChangeService;
    this.cambiar = this.cambiar.bind(this);
  }

  async cambiar(req, res) {
    const { passwordActual, passwordNueva, confirmarPassword } = req.body || {};
    const resultado = await this.passwordChangeService.cambiarPassword(
      { passwordActual, passwordNueva, confirmarPassword },
      req.usuario || req.user
    );
    return res.status(200).set('Cache-Control', 'no-store').json({
      success: true,
      message: resultado.mensaje,
    });
  }
}

module.exports = PasswordChangeController;
