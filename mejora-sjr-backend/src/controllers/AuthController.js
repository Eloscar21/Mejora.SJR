// src/controllers/AuthController.js
'use strict';

class AuthController {
  /**
   * @param {import('../services/AuthService')} authService
   */
  constructor(authService) {
    if (!authService) {
      throw new Error('authService es requerido en AuthController.');
    }
    this.authService = authService;
    this.registrarCiudadano = this.registrarCiudadano.bind(this);
    this.login = this.login.bind(this);
  }

  async registrarCiudadano(req, res) {
    const { nombre, email, password } = req.body;
    const resultado = await this.authService.registrarCiudadano({ nombre, email, password });
    return res.status(201).json({
      success: true,
      message: 'Ciudadano registrado con éxito.',
      data: resultado
    });
  }

  async login(req, res) {
    const { email, password } = req.body;
    const resultado = await this.authService.login({ email, password });
    return res.status(200).json({
      success: true,
      message: 'Autenticación exitosa.',
      data: resultado
    });
  }
}

module.exports = AuthController;
