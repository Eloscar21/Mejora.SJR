// src/repositories/IIncidenciaRepository.js
'use strict';

/**
 * Contrato IIncidenciaRepository (ISP y DIP)
 * Define las operaciones requeridas para la persistencia y gestión de incidencias ciudadanas (US-023).
 */
class IIncidenciaRepository {
  /**
   * Crea una nueva incidencia y registra su evidencia fotográfica inicial de forma transaccional.
   * @param {Object} datos
   * @param {string} datos.descripcion
   * @param {number} datos.latitud
   * @param {number} datos.longitud
   * @param {number} datos.idUsuario
   * @param {number} datos.idCategoria
   * @param {string} [datos.fotoUrl]
   * @returns {Promise<Object>} Datos de la incidencia creada
   */
  async crearIncidencia(datos) {
    throw new Error('Método no implementado');
  }

  /**
   * Busca una incidencia por su ID
   * @param {number} idIncidencia
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(idIncidencia) {
    throw new Error('Método no implementado');
  }

  /**
   * Lista incidencias aplicando filtros opcionales de departamento, estado o trabajador (US-025)
   * @param {Object} [filtros]
   * @param {number} [filtros.idDepartamento]
   * @param {number} [filtros.idEstado]
   * @param {number} [filtros.idTrabajadorAsignado]
   * @returns {Promise<Array<Object>>}
   */
  async listarIncidencias(filtros) {
    throw new Error('Método no implementado');
  }

  /**
   * Asigna una incidencia a un trabajador y actualiza su estado (US-025)
   * @param {number} idIncidencia
   * @param {number} idTrabajador
   * @param {number} nuevoEstado
   * @returns {Promise<Object|null>}
   */
  async asignarTrabajador(idIncidencia, idTrabajador, nuevoEstado = 2) {
    throw new Error('Método no implementado');
  }

  /**
   * Descarta una incidencia marcándola con IdEstado = 5 (Rechazado) y guardando motivo (US-025)
   * @param {number} idIncidencia
   * @param {string} motivoRechazo
   * @returns {Promise<Object|null>}
   */
  async descartarIncidencia(idIncidencia, motivoRechazo) {
    throw new Error('Método no implementado');
  }
}

module.exports = IIncidenciaRepository;

