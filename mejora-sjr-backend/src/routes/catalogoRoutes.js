// src/routes/catalogoRoutes.js
'use strict';

const express = require('express');
const MockCatalogoRepository = require('../repositories/MockCatalogoRepository');
const CatalogoService = require('../services/CatalogoService');
const CatalogoController = require('../controllers/CatalogoController');

/**
 * Factory para crear las rutas de catálogos con dependencias inyectadas (DIP / IoC)
 * @param {import('../repositories/ICatalogoRepository')} [catalogoRepository]
 */
const createCatalogoRouter = (catalogoRepository = new MockCatalogoRepository()) => {
  const router = express.Router();

  const catalogoService = new CatalogoService(catalogoRepository);
  const catalogoController = new CatalogoController(catalogoService);

  router.get('/departamentos', catalogoController.obtenerDepartamentos);
  router.get('/categorias', catalogoController.obtenerCategorias);

  return router;
};

module.exports = createCatalogoRouter;
