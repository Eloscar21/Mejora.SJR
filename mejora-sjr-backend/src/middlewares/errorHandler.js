'use strict';
const ValidacionError = require('../errors/ValidacionError');
const EmailDuplicadoError = require('../errors/EmailDuplicadoError');
const CredencialesInvalidasError = require('../errors/CredencialesInvalidasError');

// Traduce errores de dominio a respuestas HTTP. Es el único lugar que conoce
// el mapeo Dominio -> HTTP. Los controladores solo delegan con next(error).
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ValidacionError) {
    return res.status(400).json({ mensaje: err.message });
  }

  if (err instanceof EmailDuplicadoError) {
    return res.status(409).json({ mensaje: err.message });
  }

  if (err instanceof CredencialesInvalidasError) {
    return res.status(401).json({ mensaje: err.message });
  }

  return res.status(500).json({ mensaje: 'Error interno del servidor' });
}

module.exports = errorHandler;
