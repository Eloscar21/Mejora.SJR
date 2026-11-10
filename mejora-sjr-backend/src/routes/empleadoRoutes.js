// src/routes/empleadoRoutes.js
'use strict';

const express = require('express');
const EmpleadoService = require('../services/EmpleadoService');
const EmpleadoController = require('../controllers/EmpleadoController');
const { authenticateToken, authorizeRoles, authorizeSuperadmin } = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas de gestión de empleados con dependencias inyectadas (DIP / IoC)
 * Protegido con RBAC:
 * - Rol 3 (Admin de Departamento): solo consulta de sus trabajadores.
 * - Rol 4 (Superadmin): consulta y gestión completa.
 * 
 * @param {import('../repositories/IUsuarioRepository')} usuarioRepository
 * @param {string} [jwtSecret]
 */
const createEmpleadoRouter = (usuarioRepository, jwtSecret = process.env.JWT_SECRET) => {
  const router = express.Router();

  const empleadoService = new EmpleadoService(usuarioRepository);
  const empleadoController = new EmpleadoController(empleadoService);

  // Proteger todas las rutas de empleados con JWT y permitir únicamente roles 3 y 4
  router.use(authenticateToken(jwtSecret));
  router.use(authorizeRoles(3, 4));

  // US-021: consultar no concede permiso para crear, editar o desactivar.
  router.post('/', authorizeSuperadmin, empleadoController.crear);
  router.get('/', empleadoController.listar);
  router.put('/:id', authorizeSuperadmin, empleadoController.actualizar);
  router.patch('/:id', authorizeSuperadmin, empleadoController.desactivar);

  return router;
};

module.exports = createEmpleadoRouter;
