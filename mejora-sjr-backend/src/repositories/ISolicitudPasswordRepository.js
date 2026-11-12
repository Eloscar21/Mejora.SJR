// src/repositories/ISolicitudPasswordRepository.js
'use strict';

/**
 * Contrato ISolicitudPasswordRepository (ISP y DIP)
 * Manejo de solicitudes asistidas de restablecimiento de contraseña (US-028).
 */
class ISolicitudPasswordRepository {
  /**
   * Obtiene o crea atómicamente la única solicitud PENDIENTE de un usuario.
   * Si ya existe una pendiente, la devuelve sin modificarla ni consumir otro ID.
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
   * Resuelve únicamente una solicitud PENDIENTE (Aprobada con nuevo hash o Rechazada).
   * La transición y, al aprobar, el cambio de hash deben ser atómicos.
   * Mantiene el orden de bloqueo usuario -> solicitud para coordinarse con crearSolicitud.
   * @param {number} idSolicitud
   * @param {Object} resolucion
   * @param {number} resolucion.idUsuario - Usuario leído de la solicitud; no procede del cliente.
   * @param {string} resolucion.estado - 'APROBADA' | 'RECHAZADA'
   * @param {number} resolucion.idSuperadmin
   * @param {string} [resolucion.nuevoPasswordHash]
   * @param {string} [resolucion.notas]
   * @returns {Promise<Object|null>} null si no existe o ya fue resuelta; no modifica datos.
   */
  async resolverSolicitud(idSolicitud, resolucion) {
    throw new Error('Método no implementado');
  }
}

module.exports = ISolicitudPasswordRepository;
