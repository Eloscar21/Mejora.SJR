'use strict';

// Error de dominio: el email no existe o la contraseña no coincide.
// Deliberadamente NO diferenciamos cuál de los dos falló:
// revelar esa diferencia sería un vector de enumeración de usuarios (CWE-204).
class CredencialesInvalidasError extends Error {
  constructor() {
    super('Credenciales incorrectas');
    this.name = 'CredencialesInvalidasError';
  }
}

module.exports = CredencialesInvalidasError;
