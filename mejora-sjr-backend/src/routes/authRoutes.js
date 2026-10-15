'use strict';
const { Router } = require('express');
const { registroController: defaultRegistroController, loginController: defaultLoginController } = require('../config/container');
const { renovacionController: defaultRenovacionController } = require('../config/container');

function createAuthRouter(
  registroController = defaultRegistroController,
  loginController = defaultLoginController,
  renovacionController = defaultRenovacionController
) {
  const router = Router();
  router.post('/registro', registroController.registrar);
  router.post('/login', loginController.login);
  router.post('/renovar', renovacionController.renovar);
  return router;
}

module.exports = {
  createAuthRouter,
  authRoutes: createAuthRouter()
};

