'use strict';
const ValidacionError = require('../errors/ValidacionError');

class RegistroController {
  constructor({ registroService }) {
    this.registroService = registroService;
    this.registrar = this.registrar.bind(this);
  }

  async registrar(req, res, next) {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        throw new ValidacionError('El cuerpo de la petición es obligatorio');
      }

      const { nombre, email, password } = body;
      if (!nombre || !email || !password) {
        throw new ValidacionError('Los campos nombre, email y password son obligatorios');
      }

      await this.registroService.registrar({ nombre, email, password });

      return res.status(201).json({
        mensaje: 'Ciudadano registrado exitosamente'
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = RegistroController;
