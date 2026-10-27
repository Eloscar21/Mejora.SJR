// app.js
'use strict';

const express = require('express');
const createAuthRouter = require('./src/routes/authRoutes');
const createCatalogoRouter = require('./src/routes/catalogoRoutes');
const createEmpleadoRouter = require('./src/routes/empleadoRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

/**
 * Fábrica de la aplicación Express (IoC y SRP)
 * Ensambla middlewares, rutas y el manejador central de errores.
 * No inicia servidores físicos ni se conecta a bases de datos.
 *
 * @param {Object} dependencies
 * @param {import('./src/repositories/IUsuarioRepository')} dependencies.usuarioRepository
 * @param {import('./src/repositories/ICatalogoRepository')} dependencies.catalogoRepository
 * @param {string} [dependencies.jwtSecret]
 * @returns {express.Application}
 */
const createApp = ({ usuarioRepository, catalogoRepository, jwtSecret } = {}) => {
  // Exigencia estricta de dependencias: Prohibido usar mocks como fallback silencioso
  if (!usuarioRepository || !catalogoRepository) {
    throw new Error('usuarioRepository y catalogoRepository son obligatorios para construir la aplicación.');
  }

  const app = express();

  // Middleware de CORS para permitir la comunicacion con el Dashboard Web (Next.js)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json());

  // Rutas de la API con dependencias inyectadas
  app.use('/api/auth', createAuthRouter(usuarioRepository, jwtSecret));
  app.use('/api/catalogos', createCatalogoRouter(catalogoRepository));
  app.use('/api/empleados', createEmpleadoRouter(usuarioRepository, jwtSecret));

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor Mejora SJR activo.' });
  });

  // Middleware centralizado de errores (al final de las rutas)
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
