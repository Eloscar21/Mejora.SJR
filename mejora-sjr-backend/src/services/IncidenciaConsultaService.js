// src/services/IncidenciaConsultaService.js
'use strict';

const IIncidenciaConsultaService = require('./contracts/IIncidenciaConsultaService');

class IncidenciaConsultaService extends IIncidenciaConsultaService {
  /**
   * @param {import('../repositories/IIncidenciaRepository')} incidenciaRepository
   */
  constructor(incidenciaRepository) {
    super();
    if (!incidenciaRepository) {
      throw new Error('incidenciaRepository es requerido en IncidenciaConsultaService.');
    }
    this.incidenciaRepository = incidenciaRepository;
  }

  /** Consulta propia de US-024; la identidad procede exclusivamente del JWT autenticado. */
  async listarMisReportes(usuarioAutenticado) {
    if (!usuarioAutenticado) {
      const error = new Error('No se pudo identificar al usuario autenticado.');
      error.statusCode = 401;
      throw error;
    }
    if (usuarioAutenticado.idRol !== 1) {
      const error = new Error('Acceso denegado: Solo los ciudadanos pueden consultar sus reportes.');
      error.statusCode = 403;
      throw error;
    }
    if (!Number.isSafeInteger(usuarioAutenticado.idUsuario) || usuarioAutenticado.idUsuario <= 0) {
      const error = new Error('La sesión no tiene una identidad ciudadana válida.');
      error.statusCode = 401;
      throw error;
    }

    return await this.incidenciaRepository.listarIncidencias({ idUsuario: usuarioAutenticado.idUsuario });
  }

  /**
   * Listar incidencias con RBAC dinámico (US-025)
   * - Superadmin (Rol 4): lista todas las incidencias de todos los departamentos.
   * - Admin de Depto (Rol 3): filtra estrictamente por su propio departamento.
   * - Trabajador (Rol 2): filtra incidencias asignadas a él o de su depto.
   */
  async listarIncidencias(usuarioAutenticado, filtros = {}) {
    if (!usuarioAutenticado) {
      const error = new Error('No se pudo identificar al usuario autenticado.');
      error.statusCode = 401;
      throw error;
    }

    const rol = usuarioAutenticado.idRol || usuarioAutenticado.IdRol;
    const deptoToken = usuarioAutenticado.idDepartamento !== undefined
      ? usuarioAutenticado.idDepartamento
      : usuarioAutenticado.IdDepartamento;

    const queryFiltros = { ...filtros };

    if (rol === 3) {
      queryFiltros.idDepartamento = deptoToken;
    } else if (rol === 2) {
      queryFiltros.idDepartamento = deptoToken;
      const soloMias = filtros && (filtros.soloAsignadasAMi === true || filtros.soloAsignadasAMi === 'true');
      if (soloMias) {
        queryFiltros.idTrabajadorAsignado = usuarioAutenticado.idUsuario;
      }
    } else if (rol !== 4) {
      const error = new Error('Acceso denegado: Rol no autorizado para consultar incidencias.');
      error.statusCode = 403;
      throw error;
    }

    return await this.incidenciaRepository.listarIncidencias(queryFiltros);
  }
}

module.exports = IncidenciaConsultaService;
