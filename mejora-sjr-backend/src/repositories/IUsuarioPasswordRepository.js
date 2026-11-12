'use strict';

/** Contrato interno de credenciales. No se utiliza para listar o editar personal (ISP). */
class IUsuarioPasswordRepository {
  /**
   * @param {number} idUsuario
   * @returns {Promise<{idUsuario: number, idRol: number, activo: boolean|number, passwordHash: string}|null>}
   */
  async obtenerCredencialesPorId(idUsuario) {
    throw new Error('Método no implementado');
  }

  /**
   * Compara y actualiza en una sola operación; false significa que cambió el estado leído.
   * @param {{idUsuario: number, idRol: number, passwordHashAnterior: string, nuevoPasswordHash: string}} cambio
   * @returns {Promise<boolean>}
   */
  async cambiarPasswordSiCoincide(cambio) {
    throw new Error('Método no implementado');
  }
}

module.exports = IUsuarioPasswordRepository;
