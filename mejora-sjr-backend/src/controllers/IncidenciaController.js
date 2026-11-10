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
    this.asignar = this.asignar.bind(this);
    this.descartar = this.descartar.bind(this);
  }

  async crear(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { descripcion, latitud, longitud, idCategoria, fotoUrl } = req.body;
    const resultado = await this.incidenciaService.crearIncidencia(
      { descripcion, latitud, longitud, idCategoria, fotoUrl },
      usuarioAutenticado
    );
    return res.status(201).json({
      success: true,
      message: 'Reporte ciudadano registrado exitosamente.',
      data: resultado
    });
  }

  async listar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { idDepartamento, idEstado, idTrabajadorAsignado, soloAsignadasAMi } = req.query;
    const resultado = await this.incidenciaService.listarIncidencias(
      usuarioAutenticado,
      {
        idDepartamento,
        idEstado,
        idTrabajadorAsignado,
        soloAsignadasAMi: soloAsignadasAMi === 'true'
      }
    );
    return res.status(200).json({
      success: true,
      message: 'Incidencias recuperadas exitosamente.',
      data: resultado
    });
  }

  async asignar(req, res) {
    const usuarioAutenticado = req.usuario || req.user;
    const { id } = req.params;
    const { idTrabajador } = req.body;
    const resultado = await this.incidenciaService.asignarTrabajador(
      id,
      idTrabajador,
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
    const { motivoRechazo } = req.body;
    const resultado = await this.incidenciaService.descartarIncidencia(
      id,
      { motivoRechazo },
      usuarioAutenticado
    );
    return res.status(200).json({
      success: true,
      message: 'Incidencia descartada como ficticia/rechazada.',
      data: resultado
    });
  }
}

module.exports = IncidenciaController;

