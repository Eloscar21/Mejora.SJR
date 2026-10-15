'use strict';
const { Router } = require('express');
const { registroController: defaultRegistroController, loginController: defaultLoginController } = require('../config/container');

function createAuthRouter(
  registroController = defaultRegistroController,
  loginController = defaultLoginController
) {
  const router = Router();
  router.post('/registro', registroController.registrar);
  router.post('/login', loginController.login);
  return router;
}

module.exports = {
  createAuthRouter,
  authRoutes: createAuthRouter()
};

