'use strict';
const CredencialesInvalidasError = require('../errors/CredencialesInvalidasError');

class RenovacionController {
  constructor({ renovacionService }) {
    this.renovacionService = renovacionService;
    this.renovar = this.renovar.bind(this);
  }

  async renovar(req, res, next) {
    try {
      const authorization = req.get('authorization');
      const match = typeof authorization === 'string' && /^Bearer ([^\s]+)$/i.exec(authorization);
      if (!match) throw new CredencialesInvalidasError();
      const token = await this.renovacionService.renovar(match[1]);
      res.set('Cache-Control', 'no-store');
      return res.status(200).json({ mensaje: 'Sesión renovada', token });
    } catch (error) { return next(error); }
  }
}
module.exports = RenovacionController;
