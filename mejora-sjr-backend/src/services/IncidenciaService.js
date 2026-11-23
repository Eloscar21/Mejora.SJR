// src/services/IncidenciaService.js
'use strict';

const IncidenciaConsultaService = require('./IncidenciaConsultaService');
const IncidenciaCreacionService = require('./IncidenciaCreacionService');
const IncidenciaOperacionService = require('./IncidenciaOperacionService');

/**
 * Fachada de compatibilidad que delega a los servicios segregados (ISP):
 * - IncidenciaConsultaService (solo lectura)
 * - IncidenciaCreacionService (alta ciudadana)
 * - IncidenciaOperacionService (despacho, descarte y cambio de estado)
 */
class IncidenciaService {
  constructor(incidenciaRepository, catalogoRepository, usuarioRepository) {
    if (!incidenciaRepository) {
      throw new Error('incidenciaRepository es requerido en IncidenciaService.');
    }
    this.consultaService = new IncidenciaConsultaService(incidenciaRepository);
    this.creacionService = new IncidenciaCreacionService(incidenciaRepository, catalogoRepository);
    this.operacionService = new IncidenciaOperacionService(incidenciaRepository, usuarioRepository);
  }

  crearIncidencia(datos, usuarioAutenticado) {
    return this.creacionService.crearIncidencia(datos, usuarioAutenticado);
  }

  listarMisReportes(usuarioAutenticado) {
    return this.consultaService.listarMisReportes(usuarioAutenticado);
  }

  listarIncidencias(usuarioAutenticado, filtros = {}) {
    return this.consultaService.listarIncidencias(usuarioAutenticado, filtros);
  }

  asignarTrabajador(idIncidencia, datosTrabajador, usuarioAutenticado) {
    return this.operacionService.asignarTrabajador(idIncidencia, datosTrabajador, usuarioAutenticado);
  }

  descartarIncidencia(idIncidencia, datosDescarte, usuarioAutenticado) {
    return this.operacionService.descartarIncidencia(idIncidencia, datosDescarte, usuarioAutenticado);
  }

  actualizarEstado(idIncidencia, datosEstado, usuarioAutenticado) {
    return this.operacionService.actualizarEstado(idIncidencia, datosEstado, usuarioAutenticado);
  }
}

module.exports = IncidenciaService;
