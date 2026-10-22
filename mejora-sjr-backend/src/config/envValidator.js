// src/config/envValidator.js
'use strict';

/**
 * Validador de variables de entorno de arranque (Fail-Fast y Cero Confianza)
 * Valida la configuración obligatoria antes de iniciar el servidor.
 */
const validarEntorno = (env = process.env) => {
  const errores = [];

  // 1. Validación de JWT_SECRET
  const jwtSecret = env.JWT_SECRET;
  if (typeof jwtSecret !== 'string' || jwtSecret.trim().length === 0) {
    errores.push('JWT_SECRET es obligatorio y debe ser una cadena no vacía.');
  }

  // 2. Validación de PORT
  let port = 5000;
  if (env.PORT !== undefined && env.PORT !== '') {
    const parsedPort = Number(env.PORT);
    if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
      errores.push('PORT debe ser un número entero válido entre 1 y 65535.');
    } else {
      port = parsedPort;
    }
  }

  // 3. Validación de DATA_SOURCE
  const dataSource = (env.DATA_SOURCE || 'mock').toLowerCase();
  const fuentesPermitidas = ['mock', 'azure_sql'];
  if (!fuentesPermitidas.includes(dataSource)) {
    errores.push(`DATA_SOURCE inválido ("${dataSource}"). Opciones permitidas: ${fuentesPermitidas.join(', ')}.`);
  }

  // 4. Prohibición estricta de mocks en producción
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && dataSource === 'mock') {
    errores.push('DATA_SOURCE="mock" está estrictamente prohibido en entorno de producción.');
  }

  if (errores.length > 0) {
    const error = new Error(`Error de configuración de arranque:\n - ${errores.join('\n - ')}`);
    error.name = 'ConfigValidationError';
    throw error;
  }

  return {
    port,
    nodeEnv: env.NODE_ENV || 'development',
    jwtSecret: jwtSecret.trim(),
    jwtExpiresIn: env.JWT_EXPIRES_IN || '8h',
    dataSource
  };
};

module.exports = { validarEntorno };
