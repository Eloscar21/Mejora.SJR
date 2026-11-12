'use strict';

const bcrypt = require('bcryptjs');
const IPasswordChangeService = require('./contracts/IPasswordChangeService');

function fallo(statusCode, mensaje) {
  return Object.assign(new Error(mensaje), { statusCode });
}

/** Cambio propio de clave; independiente del registro y de la recuperación asistida (SRP). */
class PasswordChangeService extends IPasswordChangeService {
  /** @param {import('../repositories/IUsuarioPasswordRepository')} usuarioPasswordRepository */
  constructor(usuarioPasswordRepository) {
    super();
    if (!usuarioPasswordRepository) {
      throw new Error('usuarioPasswordRepository es requerido en PasswordChangeService.');
    }
    this.usuarioPasswordRepository = usuarioPasswordRepository;
  }

  async cambiarPassword({ passwordActual, passwordNueva, confirmarPassword } = {}, actor) {
    if (!actor || !Number.isSafeInteger(actor.idUsuario) || actor.idUsuario <= 0) {
      throw fallo(401, 'La sesión no es válida. Inicia sesión nuevamente.');
    }
    if (actor.idRol !== 3 && actor.idRol !== 4) {
      throw fallo(403, 'El cambio de clave del panel está reservado para roles 3 y 4.');
    }
    if (typeof passwordActual !== 'string' || passwordActual.length === 0 ||
        typeof passwordNueva !== 'string' || typeof confirmarPassword !== 'string') {
      throw fallo(400, 'La contraseña actual, la nueva y su confirmación son obligatorias.');
    }
    // El límite se mide en bytes UTF-8: bcrypt solo utiliza los primeros 72 bytes.
    if (Buffer.byteLength(passwordActual, 'utf8') > 1024) {
      throw fallo(400, 'La contraseña actual excede el tamaño permitido.');
    }
    if (Array.from(passwordNueva).length < 8 || passwordNueva.trim().length === 0 ||
        Buffer.byteLength(passwordNueva, 'utf8') > 72) {
      throw fallo(400, 'La nueva contraseña debe tener al menos 8 caracteres y como máximo 72 bytes UTF-8.');
    }
    if (passwordNueva !== confirmarPassword) {
      throw fallo(400, 'La confirmación no coincide con la nueva contraseña.');
    }

    const usuario = await this.usuarioPasswordRepository.obtenerCredencialesPorId(actor.idUsuario);
    if (!usuario || (usuario.activo !== true && usuario.activo !== 1)) {
      throw fallo(401, 'La cuenta no está disponible. Inicia sesión nuevamente.');
    }
    if (usuario.idRol !== actor.idRol) {
      throw fallo(403, 'Los permisos de tu cuenta cambiaron. Inicia sesión nuevamente.');
    }
    if (!(await bcrypt.compare(passwordActual, usuario.passwordHash))) {
      throw fallo(400, 'La contraseña actual es incorrecta.');
    }
    if (await bcrypt.compare(passwordNueva, usuario.passwordHash)) {
      throw fallo(400, 'La nueva contraseña debe ser diferente de la actual.');
    }

    const nuevoPasswordHash = await bcrypt.hash(passwordNueva, 10);
    const actualizado = await this.usuarioPasswordRepository.cambiarPasswordSiCoincide({
      idUsuario: actor.idUsuario,
      idRol: usuario.idRol,
      passwordHashAnterior: usuario.passwordHash,
      nuevoPasswordHash,
    });
    if (!actualizado) {
      throw fallo(409, 'La cuenta o su contraseña cambió durante la operación. Verifica tus credenciales antes de intentarlo de nuevo.');
    }

    // No se devuelven hashes, claves ni JWT. La política de sesiones existente se conserva.
    return { mensaje: 'Tu contraseña se actualizó correctamente.' };
  }
}

module.exports = PasswordChangeService;
