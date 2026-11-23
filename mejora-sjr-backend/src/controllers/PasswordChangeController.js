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
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.passwordChangeService.cambiarPassword(req.body, usuarioAutenticado);
    return res.status(200).set('Cache-Control', 'no-store').json({
      success: true,
      message: resultado.mensaje,
    });
  }
}

module.exports = PasswordChangeController;
