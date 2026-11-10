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
}

module.exports = IIncidenciaRepository;
