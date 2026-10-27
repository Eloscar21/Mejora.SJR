// src/middlewares/authMiddleware.js
'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware para validar autenticación mediante token JWT Bearer
 * @param {string} jwtSecret
 */
const authenticateToken = (jwtSecret = process.env.JWT_SECRET) => {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      const error = new Error('Acceso no autorizado: Token no proporcionado.');
      error.statusCode = 401;
      return next(error);
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      req.user = decoded;
      next();
    } catch (err) {
      const error = new Error('Token inválido o expirado.');
      error.statusCode = 401;
      return next(error);
    }
  };
};

/**
 * Middleware para autorizar acceso basado en roles (RBAC)
 * @param {number[]} rolesPermitidos - Array de IDs de roles autorizados (e.g. [3, 4])
 */
const authorizeRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.idRol)) {
      const error = new Error('Acceso denegado: No posees privilegios suficientes para esta operación.');
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};
