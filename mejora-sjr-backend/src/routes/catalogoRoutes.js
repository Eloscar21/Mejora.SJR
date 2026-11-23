// src/routes/catalogoRoutes.js
'use strict';

const express = require('express');
const MockCatalogoRepository = require('../repositories/MockCatalogoRepository');
const CatalogoService = require('../services/CatalogoService');
const CatalogoController = require('../controllers/CatalogoController');
const {
  authenticateOptionalToken,
  authenticateToken,
  authorizeRoles
} = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas de catálogos con dependencias inyectadas (DIP / IoC)
 * Soporta aislamiento departamental (US-030) y persistencia real de nuevas categorías (US-035).
 * @param {import('../repositories/ICatalogoRepository')} [catalogoRepository]
 * @param {string} [jwtSecret]
 */
const createCatalogoRouter = (
  catalogoRepository = new MockCatalogoRepository(),
  jwtSecret = process.env.JWT_SECRET
) => {
  const router = express.Router();

  const catalogoService = new CatalogoService(catalogoRepository);
  const catalogoController = new CatalogoController(catalogoService);

  const optionalAuth = authenticateOptionalToken(jwtSecret);
  const requireAuth = authenticateToken(jwtSecret);

  router.get('/departamentos', optionalAuth, catalogoController.obtenerDepartamentos);
  router.get('/categorias', optionalAuth, catalogoController.obtenerCategorias);

  // US-035: Creación y edición física de categorías con RBAC por departamento (Roles 3 y 4)
  router.post('/categorias', requireAuth, authorizeRoles(3, 4), catalogoController.crearCategoria);
  router.patch('/categorias/:id/estado', requireAuth, authorizeRoles(3, 4), catalogoController.cambiarEstado);
  router.put('/categorias/:id', requireAuth, authorizeRoles(3, 4), catalogoController.actualizarCategoria);
  router.patch('/categorias/:id', requireAuth, authorizeRoles(3, 4), catalogoController.actualizarCategoria);

  return router;
};

module.exports = createCatalogoRouter;
