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
}

module.exports = IncidenciaController;
