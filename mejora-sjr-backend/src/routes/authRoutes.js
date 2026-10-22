// src/routes/authRoutes.js
'use strict';

const express = require('express');
const MockUsuarioRepository = require('../repositories/MockUsuarioRepository');
const AuthService = require('../services/AuthService');
const AuthController = require('../controllers/AuthController');

/**
 * Factory para crear las rutas de autenticación con dependencias inyectadas (DIP / IoC)
 * @param {import('../repositories/IUsuarioRepository')} usuarioRepository
 * @param {string} [jwtSecret]
 */
const createAuthRouter = (usuarioRepository, jwtSecret) => {
  const router = express.Router();

  const authService = new AuthService(usuarioRepository, jwtSecret);
  const authController = new AuthController(authService);

  router.post('/registro', authController.registrarCiudadano);
  router.post('/login', authController.login);

  return router;
};

module.exports = createAuthRouter;
