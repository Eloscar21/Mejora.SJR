// src/routes/empleadoRoutes.js
'use strict';

const express = require('express');
const EmpleadoService = require('../services/EmpleadoService');
const EmpleadoController = require('../controllers/EmpleadoController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

/**
 * Factory para crear las rutas de gestión de empleados con dependencias inyectadas (DIP / IoC)
 * Protegido con RBAC:
 * - Rol 3 (Admin de Departamento)
 * - Rol 4 (Superadmin)
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

  // Endpoints CRUD de empleados (US-008)
  router.post('/', empleadoController.crear);
  router.get('/', empleadoController.listar);
  router.put('/:id', empleadoController.actualizar);
  router.patch('/:id', empleadoController.desactivar);

  return router;
};

module.exports = createEmpleadoRouter;
