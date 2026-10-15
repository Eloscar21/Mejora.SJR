'use strict';

class ValidacionError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ValidacionError';
  }
}

module.exports = ValidacionError;
