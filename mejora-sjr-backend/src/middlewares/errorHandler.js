// src/middlewares/errorHandler.js
'use strict';

/**
 * Middleware centralizado de manejo de errores (SRP y Zero-Trust)
 * Valida estrictamente códigos HTTP y previene fugas de información interna.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // 1. Validación estricta del tipo original: debe ser explícitamente un 'number', entero, entre 400 y 599.
  // No se permite coerción de strings ("400"), null, booleanos ni objetos.
  const rawStatus = err?.statusCode;
  const isValidStatusCode = typeof rawStatus === 'number' && Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599;
  const statusCode = isValidStatusCode ? rawStatus : 500;

  // 2. Protección de información interna para errores 500 en producción
  const isProduction = process.env.NODE_ENV === 'production';
  let message;

  if (statusCode === 500) {
    message = isProduction ? 'Error interno del servidor.' : (err?.message || 'Error interno del servidor.');
  } else {
    message = err?.message || 'Ocurrió un error al procesar la solicitud.';
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
