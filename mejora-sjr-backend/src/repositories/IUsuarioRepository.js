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
   * Lista o consulta empleados (roles 2 y 3) con soporte para empleados activos/inactivos y filtro opcional por departamento (US-008 / US-019).
   * @param {Object} [filtros]
   * @param {number[]} [filtros.roles]
   * @param {number} [filtros.idDepartamento]
   * @param {boolean} [filtros.soloActivos]
   */
  async obtenerEmpleados(filtros) {
    throw new Error('Método no implementado');
  }

  /**
   * Alias retrocompatible de obtenerEmpleados
   * @param {Object} [filtros]
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
