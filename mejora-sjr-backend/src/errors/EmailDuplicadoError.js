'use strict';

class EmailDuplicadoError extends Error {
  constructor(message = 'El correo ya está registrado') {
    super(message);
    this.name = 'EmailDuplicadoError';
  }
}

module.exports = EmailDuplicadoError;
