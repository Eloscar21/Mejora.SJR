// src/routes/catalogoRoutes.js
'use strict';

const express = require('express');
const MockCatalogoRepository = require('../repositories/MockCatalogoRepository');
const CatalogoService = require('../services/CatalogoService');
const CatalogoController = require('../controllers/CatalogoController');
const { authenticateOptionalToken } = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas de catálogos con dependencias inyectadas (DIP / IoC)
 * Soporta aislamiento departamental (US-030) cuando se proporciona JWT.
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

  router.get('/departamentos', optionalAuth, catalogoController.obtenerDepartamentos);
  router.get('/categorias', optionalAuth, catalogoController.obtenerCategorias);

  return router;
};

module.exports = createCatalogoRouter;
