// src/controllers/EmpleadoController.js
'use strict';

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

  async listar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const soloActivos = req.query.soloActivos === 'true';
    const resultado = await this.empleadoService.listarEmpleados(usuarioAutenticado, { soloActivos });
    return res.status(200).json({
      success: true,
      message: 'Empleados recuperados exitosamente.',
      data: resultado
    });
  }

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
