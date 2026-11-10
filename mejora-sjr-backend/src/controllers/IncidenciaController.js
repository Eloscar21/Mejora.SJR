// src/controllers/IncidenciaController.js
'use strict';

/**
 * IncidenciaController (Skinny Controller)
 * Conforme al Prompt Maestro:
 * - Sin bloques try/catch redundantes (capturado por el manejador global de errores).
 * - Delega 100% de la lógica a IncidenciaService.
 */
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

  /**
   * POST /api/incidencias
   * Registro de reporte ciudadano
   */
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

  /**
   * GET /api/incidencias
   * Consulta con filtro RBAC dinámico (US-025)
   */
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

  /**
   * PATCH /api/incidencias/:id/asignar
   * Asignación a cuadrilla de campo (US-025)
   */
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

  /**
   * PATCH /api/incidencias/:id/descartar
   * Descarte de reporte ficticio / broma (US-025)
   */
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

