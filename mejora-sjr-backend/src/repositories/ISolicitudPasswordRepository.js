// src/repositories/ISolicitudPasswordRepository.js
'use strict';

/**
 * Contrato ISolicitudPasswordRepository (ISP y DIP)
 * Manejo de solicitudes asistidas de restablecimiento de contraseña (US-028).
 */
class ISolicitudPasswordRepository {
  /**
   * Crea una nueva solicitud en estado PENDIENTE
   * @param {Object} datos
   * @param {number} datos.idUsuario
   * @param {string} datos.email
   * @returns {Promise<Object>}
   */
  async crearSolicitud({ idUsuario, email }) {
    throw new Error('Método no implementado');
  }

  /**
   * Obtiene solicitudes filtradas opcionalmente por estado
   * @param {string} [estado] - 'PENDIENTE', 'APROBADA', 'RECHAZADA'
   * @returns {Promise<Array<Object>>}
   */
  async listarSolicitudes(estado) {
    throw new Error('Método no implementado');
  }

  /**
   * Busca solicitud por ID
   * @param {number} idSolicitud
   * @returns {Promise<Object|null>}
   */
  async buscarPorId(idSolicitud) {
    throw new Error('Método no implementado');
  }

  /**
   * Resuelve una solicitud (Aprobada con nuevo hash o Rechazada)
   * @param {number} idSolicitud
   * @param {Object} resolucion
   * @param {string} resolucion.estado - 'APROBADA' | 'RECHAZADA'
   * @param {number} resolucion.idSuperadmin
   * @param {string} [resolucion.nuevoPasswordHash]
   * @param {string} [resolucion.notas]
   * @returns {Promise<Object>}
   */
  async resolverSolicitud(idSolicitud, resolucion) {
    throw new Error('Método no implementado');
  }
}

module.exports = ISolicitudPasswordRepository;
