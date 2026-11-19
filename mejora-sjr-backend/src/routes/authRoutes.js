// src/routes/authRoutes.js
'use strict';

const express = require('express');
const MockUsuarioRepository = require('../repositories/MockUsuarioRepository');
const AuthService = require('../services/AuthService');
const AuthController = require('../controllers/AuthController');
const PasswordChangeService = require('../services/PasswordChangeService');
const PasswordChangeController = require('../controllers/PasswordChangeController');
const PerfilService = require('../services/PerfilService');
const PerfilController = require('../controllers/PerfilController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas de autenticación con dependencias inyectadas (DIP / IoC)
 * @param {import('../repositories/IUsuarioRepository') & import('../repositories/IUsuarioPasswordRepository')} usuarioRepository
 * @param {string} [jwtSecret]
 */
const createAuthRouter = (usuarioRepository, jwtSecret) => {
  const router = express.Router();

  const authService = new AuthService(usuarioRepository, jwtSecret);
  const authController = new AuthController(authService);
  const passwordChangeService = new PasswordChangeService(usuarioRepository);
  const passwordChangeController = new PasswordChangeController(passwordChangeService);
  const perfilService = new PerfilService(usuarioRepository);
  const perfilController = new PerfilController(perfilService);

  router.post('/registro', authController.registrarCiudadano);
  router.post('/login', authController.login);
  router.patch('/password', authenticateToken(jwtSecret), authorizeRoles(3, 4), passwordChangeController.cambiar);

  // US-032: Apartado "Mis Datos" / Perfil Ciudadano
  router.get('/perfil', authenticateToken(jwtSecret), perfilController.obtener);
  router.put('/perfil', authenticateToken(jwtSecret), perfilController.actualizar);
  router.patch('/perfil', authenticateToken(jwtSecret), perfilController.actualizar);

  return router;
};

module.exports = createAuthRouter;
