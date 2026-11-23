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
    this.reactivar = this.reactivar.bind(this);
  }

  async crear(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.empleadoService.crearEmpleado(req.body, usuarioAutenticado);
    return res.status(201).json({
      success: true,
      message: 'Empleado creado exitosamente.',
      data: resultado
    });
  }

  async listar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.empleadoService.listarEmpleados(usuarioAutenticado, req.query);
    return res.status(200).json({
      success: true,
      message: 'Empleados recuperados exitosamente.',
      data: resultado
    });
  }

  async actualizar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.empleadoService.actualizarEmpleado(id, req.body, usuarioAutenticado);
    return res.status(200).json({
      success: true,
      message: 'Empleado actualizado exitosamente.',
      data: resultado
    });
  }

  async desactivar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.empleadoService.desactivarEmpleado(id, usuarioAutenticado);
    return res.status(200).json({
      success: true,
      message: resultado.mensaje
    });
  }

  async reactivar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    await this.empleadoService.reactivarEmpleado(id, usuarioAutenticado);
    return res.status(200).json({
      success: true,
      message: 'Empleado reactivado.'
    });
  }
}

module.exports = EmpleadoController;
