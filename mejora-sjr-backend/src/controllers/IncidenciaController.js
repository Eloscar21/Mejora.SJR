// src/controllers/IncidenciaController.js
'use strict';

class IncidenciaController {
  /**
   * @param {import('../services/IncidenciaService')} incidenciaService
   */
  constructor(incidenciaService) {
    if (!incidenciaService) {
      throw new Error('incidenciaService es requerido en IncidenciaController.');
    }
    this.incidenciaService = incidenciaService;
    this.crear = this.crear.bind(this);
    this.listar = this.listar.bind(this);
    this.listarMisReportes = this.listarMisReportes.bind(this);
    this.asignar = this.asignar.bind(this);
    this.descartar = this.descartar.bind(this);
    this.actualizarEstado = this.actualizarEstado.bind(this);
  }

  async crear(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.incidenciaService.crearIncidencia(req.body, usuarioAutenticado);
    return res.status(201).json({
      success: true,
      message: 'Reporte ciudadano registrado exitosamente.',
      data: resultado
    });
  }

  async listarMisReportes(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.incidenciaService.listarMisReportes(usuarioAutenticado);
    return res.status(200).json({
      success: true,
      message: 'Tus reportes fueron recuperados exitosamente.',
      data: resultado
    });
  }

  async listar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.incidenciaService.listarIncidencias(usuarioAutenticado, req.query);
    return res.status(200).json({
      success: true,
      message: 'Incidencias recuperadas exitosamente.',
      data: resultado
    });
  }

  async asignar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.incidenciaService.asignarTrabajador(
      id,
      req.body,
      usuarioAutenticado
    );
    return res.status(200).json({
      success: true,
      message: 'Incidencia asignada al trabajador exitosamente.',
      data: resultado
    });
  }

  async descartar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.incidenciaService.descartarIncidencia(
      id,
      req.body,
      usuarioAutenticado
    );
    return res.status(200).json({
      success: true,
      message: 'Incidencia descartada como ficticia/rechazada.',
      data: resultado
    });
  }

  async actualizarEstado(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.incidenciaService.actualizarEstado(
      id,
      req.body,
      usuarioAutenticado
    );
    return res.status(200).json({
      success: true,
      message: 'Estado de la incidencia actualizado exitosamente.',
      data: resultado
    });
  }
}

module.exports = IncidenciaController;

