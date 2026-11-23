// src/services/contracts/IIncidenciaConsultaService.js
'use strict';

/** Contrato segregado de solo lectura para consultas de incidencias (ISP). */
class IIncidenciaConsultaService {
  async listarMisReportes(usuarioAutenticado) {
    throw new Error('Método no implementado');
  }

  async listarIncidencias(usuarioAutenticado, filtros) {
    throw new Error('Método no implementado');
  }
}

module.exports = IIncidenciaConsultaService;
