'use strict';
const { Router } = require('express');
const { registroController: defaultController } = require('../config/container');

function createAuthRouter(registroController = defaultController) {
  const router = Router();
  router.post('/registro', registroController.registrar);
  return router;
}

module.exports = {
  createAuthRouter,
  authRoutes: createAuthRouter()
};
