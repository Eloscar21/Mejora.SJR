// src/repositories/IUsuarioRepository.js
'use strict';

/**
 * Contrato IUsuarioRepository (ISP y DIP)
 * Define las operaciones requeridas para la persistencia de usuarios y gestión de empleados (US-001 / US-008).
 */
class IUsuarioRepository {
  async buscarPorEmail(email) {
    throw new Error('Método no implementado');
  }

  async crearUsuario(datosUsuario) {
    throw new Error('Método no implementado');
  }

  async buscarPorId(idUsuario) {
    throw new Error('Método no implementado');
  }

  /**
   * Lista usuarios activos filtrando por roles de personal (Trabajador y Admin) y opcionalmente por departamento
   * @param {Object} [filtros]
   * @param {number[]} [filtros.roles]
   * @param {number} [filtros.idDepartamento]
   */
  async listarEmpleadosActivos(filtros) {
    throw new Error('Método no implementado');
  }

  /**
   * Actualiza los datos de un empleado (nombre, idRol, idDepartamento)
   * @param {number} idUsuario
   * @param {Object} datos
   * @param {string} datos.nombre
   * @param {number} datos.idRol
   * @param {number} [datos.idDepartamento]
   */
  async actualizarEmpleado(idUsuario, datos) {
    throw new Error('Método no implementado');
  }

  /**
   * Desactiva lógicamente a un empleado (Soft Delete: Activo = 0)
   * @param {number} idUsuario
   */
  async desactivarEmpleado(idUsuario) {
    throw new Error('Método no implementado');
  }
}

module.exports = IUsuarioRepository;
