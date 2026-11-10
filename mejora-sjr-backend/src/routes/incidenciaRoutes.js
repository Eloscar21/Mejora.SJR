// src/routes/incidenciaRoutes.js
'use strict';

const express = require('express');
const IncidenciaService = require('../services/IncidenciaService');
const IncidenciaController = require('../controllers/IncidenciaController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas de incidencias ciudadanas (DIP / IoC)
 * @param {import('../repositories/IIncidenciaRepository')} incidenciaRepository
 * @param {import('../repositories/ICatalogoRepository')} catalogoRepository
 * @param {import('../repositories/IUsuarioRepository')} [usuarioRepository]
 * @param {string} [jwtSecret]
 */
const createIncidenciaRouter = (
  incidenciaRepository,
  catalogoRepository,
  usuarioRepository,
  jwtSecret = process.env.JWT_SECRET
) => {
  const router = express.Router();

  const incidenciaService = new IncidenciaService(incidenciaRepository, catalogoRepository, usuarioRepository);
  const incidenciaController = new IncidenciaController(incidenciaService);

  // Todas las rutas requieren autenticación JWT
  router.use(authenticateToken(jwtSecret));

  // POST /api/incidencias - Registro de incidencia ciudadana (US-023: Rol 1 Ciudadano)
  router.post('/', incidenciaController.crear);

  // GET /api/incidencias - Listado con RBAC dinámico (US-025: Roles 2, 3 y 4)
  router.get('/', authorizeRoles(2, 3, 4), incidenciaController.listar);

  // PATCH /api/incidencias/:id/asignar - Asignación a cuadrilla de campo (US-025: Roles 3 y 4)
  router.patch('/:id/asignar', authorizeRoles(3, 4), incidenciaController.asignar);

  // PATCH /api/incidencias/:id/descartar - Descarte de reporte ficticio (US-025: Roles 3 y 4)
  router.patch('/:id/descartar', authorizeRoles(3, 4), incidenciaController.descartar);

  return router;
};

module.exports = createIncidenciaRouter;


