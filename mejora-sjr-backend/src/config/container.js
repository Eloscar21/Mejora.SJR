'use strict';
const { getPool, sql } = require('./dbPool');
const hasher = require('./hasher');
const UsuarioRepository = require('../repositories/UsuarioRepository');
const RegistroService = require('../services/RegistroService');
const RegistroController = require('../controllers/RegistroController');

// Raíz de composición: aquí y solo aquí se instancian las dependencias concretas.
const usuarioRepository = new UsuarioRepository({ getPool, sql });
const registroService = new RegistroService({ usuarioRepository, hasher });
const registroController = new RegistroController({ registroService });

module.exports = {
  usuarioRepository,
  registroService,
  registroController
};
