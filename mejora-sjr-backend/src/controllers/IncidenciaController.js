// src/controllers/IncidenciaController.js
'use strict';

class IncidenciaController {
  /**
   * Recibe servicios segregados (ISP) o una fachada compatible.
   * @param {Object} servicios
   * @param {import('../services/contracts/IIncidenciaConsultaService')} [servicios.consultaService]
   * @param {import('../services/contracts/IIncidenciaCreacionService')} [servicios.creacionService]
   * @param {import('../services/contracts/IIncidenciaOperacionService')} [servicios.operacionService]
   */
  constructor(servicios) {
    if (!servicios) {
      throw new Error('incidenciaService es requerido en IncidenciaController.');
    }
    this.consultaService = servicios.consultaService || servicios;
    this.creacionService = servicios.creacionService || servicios;
    this.operacionService = servicios.operacionService || servicios;

    this.crear = this.crear.bind(this);
    this.listar = this.listar.bind(this);
    this.listarMisReportes = this.listarMisReportes.bind(this);
    this.asignar = this.asignar.bind(this);
    this.descartar = this.descartar.bind(this);
    this.actualizarEstado = this.actualizarEstado.bind(this);
  }

  async crear(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.creacionService.crearIncidencia(req.body, usuarioAutenticado);
    return res.status(201).json({
      success: true,
      message: 'Reporte ciudadano registrado exitosamente.',
      data: resultado
    });
  }

  async listarMisReportes(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.consultaService.listarMisReportes(usuarioAutenticado);
    return res.status(200).json({
      success: true,
      message: 'Tus reportes fueron recuperados exitosamente.',
      data: resultado
    });
  }

  async listar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const resultado = await this.consultaService.listarIncidencias(usuarioAutenticado, req.query);
    return res.status(200).json({
      success: true,
      message: 'Incidencias recuperadas exitosamente.',
      data: resultado
    });
  }

  async asignar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const resultado = await this.operacionService.asignarTrabajador(
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
    const resultado = await this.operacionService.descartarIncidencia(
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
    const resultado = await this.operacionService.actualizarEstado(
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
