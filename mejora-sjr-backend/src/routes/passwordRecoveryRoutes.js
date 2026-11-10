// src/routes/passwordRecoveryRoutes.js
'use strict';

const express = require('express');
const PasswordRecoveryService = require('../services/PasswordRecoveryService');
const PasswordRecoveryController = require('../controllers/PasswordRecoveryController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * Factory para rutas del flujo asistido de contraseñas (US-028)
 * @param {import('../repositories/ISolicitudPasswordRepository')} solicitudPasswordRepository
 * @param {import('../repositories/IUsuarioRepository')} usuarioRepository
 * @param {string} [jwtSecret]
 */
const createPasswordRecoveryRouter = (
  solicitudPasswordRepository,
  usuarioRepository,
  jwtSecret = process.env.JWT_SECRET
) => {
  const router = express.Router();

  const service = new PasswordRecoveryService(solicitudPasswordRepository, usuarioRepository);
  const controller = new PasswordRecoveryController(service);

  // 1. Endpoint público para solicitar reseteo desde Login
  router.post('/solicitar', controller.solicitar);

  // 2. Endpoints protegidos exclusivamente para Superadmin (Rol 4)
  router.get('/', authenticateToken(jwtSecret), authorizeRoles(4), controller.listar);
  router.patch('/:id/aprobar', authenticateToken(jwtSecret), authorizeRoles(4), controller.aprobar);
  router.patch('/:id/rechazar', authenticateToken(jwtSecret), authorizeRoles(4), controller.rechazar);

  return router;
};

module.exports = createPasswordRecoveryRouter;
