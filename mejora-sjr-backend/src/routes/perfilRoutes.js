// src/routes/perfilRoutes.js
'use strict';

const express = require('express');
const PerfilService = require('../services/PerfilService');
const PerfilController = require('../controllers/PerfilController');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas del apartado "Mis Datos" / Perfil Ciudadano (US-032)
 * @param {import('../repositories/IUsuarioRepository')} usuarioRepository
 * @param {import('../repositories/IIncidenciaRepository')} [incidenciaRepository]
 * @param {string} [jwtSecret]
 */
const createPerfilRouter = (
  usuarioRepository,
  incidenciaRepository = null,
  jwtSecret = process.env.JWT_SECRET
) => {
  const router = express.Router();

  const perfilService = new PerfilService(usuarioRepository, incidenciaRepository);
  const perfilController = new PerfilController(perfilService);

  router.use(authenticateToken(jwtSecret));

  router.get('/', perfilController.obtener);
  router.put('/', perfilController.actualizar);
  router.patch('/', perfilController.actualizar);

  return router;
};

module.exports = createPerfilRouter;
