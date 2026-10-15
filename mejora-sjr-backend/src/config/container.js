'use strict';
const { getPool, sql } = require('./dbPool');
const hasher = require('./hasher');
const tokenSigner = require('./tokenSigner');
const UsuarioRepository = require('../repositories/UsuarioRepository');
const RegistroService = require('../services/RegistroService');
const LoginService = require('../services/LoginService');
const RegistroController = require('../controllers/RegistroController');
const LoginController = require('../controllers/LoginController');
const RenovacionService = require('../services/RenovacionService');
const RenovacionController = require('../controllers/RenovacionController');

// Raíz de composición: aquí y solo aquí se instancian las dependencias concretas.
const usuarioRepository = new UsuarioRepository({ getPool, sql });
const registroService = new RegistroService({ usuarioRepository, hasher });
const loginService = new LoginService({ usuarioRepository, hasher, tokenSigner });
const registroController = new RegistroController({ registroService });
const loginController = new LoginController({ loginService });
const renovacionService = new RenovacionService({ usuarioRepository, tokenSigner });
const renovacionController = new RenovacionController({ renovacionService });

module.exports = {
  usuarioRepository,
  registroService,
  loginService,
  registroController,
  loginController,
  renovacionController
};

