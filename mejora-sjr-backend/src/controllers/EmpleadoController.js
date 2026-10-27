// src/controllers/EmpleadoController.js
'use strict';

/**
 * EmpleadoController (Skinny Controller)
 * Conforme al Prompt Maestro:
 * - Sin try/catch redundantes (el manejador central errorHandler captura excepciones).
 * - Delega 100% de la lógica a EmpleadoService.
 */
class EmpleadoController {
  /**
   * @param {import('../services/EmpleadoService')} empleadoService
   */
  constructor(empleadoService) {
    if (!empleadoService) {
      throw new Error('empleadoService es requerido en EmpleadoController.');
    }
    this.empleadoService = empleadoService;
    this.crear = this.crear.bind(this);
    this.listar = this.listar.bind(this);
    this.actualizar = this.actualizar.bind(this);
    this.desactivar = this.desactivar.bind(this);
  }

  /**
   * POST /api/empleados
   */
  async crear(req, res) {
    const { nombre, email, password, idRol, idDepartamento } = req.body;
    const resultado = await this.empleadoService.crearEmpleado(
      { nombre, email, password, idRol, idDepartamento },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente.',
      data: resultado
    });
  }

  /**
   * GET /api/empleados
   */
  async listar(req, res) {
    const resultado = await this.empleadoService.listarEmpleados(req.user);

    return res.status(200).json({
      success: true,
      message: 'Empleados activos recuperados exitosamente.',
      data: resultado
    });
  }

  /**
   * PUT /api/empleados/:id
   */
  async actualizar(req, res) {
    const { id } = req.params;
    const { nombre, idRol, idDepartamento } = req.body;
    const resultado = await this.empleadoService.actualizarEmpleado(
      id,
      { nombre, idRol, idDepartamento },
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Empleado actualizado exitosamente.',
      data: resultado
    });
  }

  /**
   * PATCH /api/empleados/:id
   */
  async desactivar(req, res) {
    const { id } = req.params;
    const resultado = await this.empleadoService.desactivarEmpleado(id, req.user);

    return res.status(200).json({
      success: true,
      message: resultado.mensaje
    });
  }
}

module.exports = EmpleadoController;
