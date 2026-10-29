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

/**
 * Middleware RBAC de autorización estricta para rutas de gestión (US-007)
 * Valida el rol del usuario autenticado e impide el acceso si IdRol !== 4 (Superadmin).
 * Retorna 403 Forbidden para cualquier rol diferente de 4 (Ciudadano 1, Trabajador 2, Admin Depto 3).
 */
const authorizeSuperadmin = (req, res, next) => {
  if (!req.user) {
    const error = new Error('Acceso no autorizado: Autenticación requerida.');
    error.statusCode = 401;
    return next(error);
  }

  if (req.user.idRol !== 4) {
    const error = new Error('Acceso denegado: Se requieren privilegios estrictos de Superadmin (IdRol 4) para acceder a estas rutas de gestión.');
    error.statusCode = 403;
    return next(error);
  }

  next();
};

/**
 * Middleware compuesto (Autenticación Bearer + RBAC estricto Superadmin)
 * Valida el token JWT e impide el acceso a las rutas de gestión si IdRol !== 4 (US-007).
 * @param {string} [jwtSecret]
 */
const requireSuperadmin = (jwtSecret = process.env.JWT_SECRET) => {
  const auth = authenticateToken(jwtSecret);
  return (req, res, next) => {
    auth(req, res, (err) => {
      if (err) return next(err);
      authorizeSuperadmin(req, res, next);
    });
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeSuperadmin,
  requireSuperadmin
};

