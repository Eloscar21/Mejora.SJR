// src/routes/incidenciaRoutes.js
'use strict';

const express = require('express');
const IncidenciaService = require('../services/IncidenciaService');
const IncidenciaController = require('../controllers/IncidenciaController');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas de incidencias ciudadanas (DIP / IoC)
 * @param {import('../repositories/IIncidenciaRepository')} incidenciaRepository
 * @param {import('../repositories/ICatalogoRepository')} catalogoRepository
 * @param {string} [jwtSecret]
 */
const createIncidenciaRouter = (incidenciaRepository, catalogoRepository, jwtSecret = process.env.JWT_SECRET) => {
  const router = express.Router();

  const incidenciaService = new IncidenciaService(incidenciaRepository, catalogoRepository);
  const incidenciaController = new IncidenciaController(incidenciaService);

  // Requerir autenticación JWT
  router.use(authenticateToken(jwtSecret));

  // POST /api/incidencias - Registro de incidencia ciudadana (US-023)
  router.post('/', incidenciaController.crear);

  return router;
};

module.exports = createIncidenciaRouter;
