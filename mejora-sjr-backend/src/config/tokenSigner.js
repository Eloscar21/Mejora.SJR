'use strict';
const jwt = require('jsonwebtoken');

// Adaptador JWT: encapsula jsonwebtoken para que el resto del código
// no dependa directamente de la librería. Si mañana cambiamos a jose o
// a otro proveedor, solo tocamos este archivo. DIP en acción.
const tokenSigner = {
  sign(payload) {
    const secret = process.env.JWT_SECRET;
    const expiresIn = payload.canal === 'movil' ? '15m' : (process.env.JWT_EXPIRES_IN || '8h');

    if (!secret) {
      throw new Error('[Config] JWT_SECRET no está definido en las variables de entorno');
    }

    return jwt.sign(payload, secret, { expiresIn });
  },

  verify(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('[Config] JWT_SECRET no está definido en las variables de entorno');
    }
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  }
};

module.exports = tokenSigner;
