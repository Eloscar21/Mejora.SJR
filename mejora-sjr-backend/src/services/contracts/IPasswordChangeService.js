'use strict';

/** Contrato exclusivo del cambio propio; no incluye login ni aprobación de solicitudes (ISP). */
class IPasswordChangeService {
  /**
   * @param {{passwordActual: string, passwordNueva: string, confirmarPassword: string}} datos
   * @param {{idUsuario: number, idRol: number}} actor - Identidad del JWT verificado.
   * @returns {Promise<{mensaje: string}>}
   */
  async cambiarPassword(datos, actor) {
    throw new Error('Método no implementado');
  }
}

module.exports = IPasswordChangeService;
