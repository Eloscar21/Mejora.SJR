// src/services/PasswordRecoveryService.js
'use strict';

const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');

function conflictoResolucion() {
  const error = new Error('La solicitud ya fue atendida. Actualiza la bandeja antes de continuar.');
  error.statusCode = 409;
  return error;
}

/**
 * PasswordRecoveryService
 * Reglas de negocio para el flujo asistido de reseteo de contraseñas (US-028).
 */
class PasswordRecoveryService {
  /**
   * @param {import('../repositories/ISolicitudPasswordRepository')} solicitudPasswordRepository
   * @param {import('../repositories/IUsuarioRepository')} usuarioRepository
   */
  constructor(solicitudPasswordRepository, usuarioRepository) {
    if (!solicitudPasswordRepository) {
      throw new Error('solicitudPasswordRepository es requerido en PasswordRecoveryService.');
    }
    if (!usuarioRepository) {
      throw new Error('usuarioRepository es requerido en PasswordRecoveryService.');
    }
    this.solicitudPasswordRepository = solicitudPasswordRepository;
    this.usuarioRepository = usuarioRepository;
  }

  /**
   * Genera 128 bits aleatorios y los representa como 22 caracteres ASCII base64url.
   * No impone grupos de caracteres; la entropía procede de node:crypto.
   */
  generarPasswordTemporal() {
    return randomBytes(16).toString('base64url');
  }

  /**
   * Solicitar reseteo de contraseña desde el login (Público)
   * Regla Zero-Trust: Siempre responde mensaje genérico para evitar enumeración de usuarios.
   */
  async solicitarReseteo(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      const error = new Error('Debe proporcionar un correo electrónico válido.');
      error.statusCode = 400;
      throw error;
    }

    const emailNormalizado = email.trim().toLowerCase();
    const usuario = await this.usuarioRepository.buscarPorEmail(emailNormalizado);

    // Solo se permite la solicitud asistida a roles de personal (Trabajador 2 y Admin 3)
    if (usuario && (usuario.idRol === 2 || usuario.idRol === 3) && usuario.activo !== 0 && usuario.activo !== false) {
      // La persistencia obtiene o crea la pendiente de forma atómica; una lectura previa no basta.
      await this.solicitudPasswordRepository.crearSolicitud({
        idUsuario: usuario.idUsuario,
        email: emailNormalizado
      });
    }

    // Respuesta genérica de seguridad
    return {
      mensaje: 'Si el correo pertenece a una cuenta activa de personal, la solicitud ha sido enviada al Superadministrador para su revisión.'
    };
  }

  /**
   * Listar solicitudes de reseteo (Exclusivo Superadmin Rol 4)
   */
  async listarSolicitudes(usuarioAutenticado, estado = 'PENDIENTE') {
    if (!usuarioAutenticado || (usuarioAutenticado.idRol !== 4 && usuarioAutenticado.IdRol !== 4)) {
      const error = new Error('Acceso denegado: Exclusivo para Superadministradores.');
      error.statusCode = 403;
      throw error;
    }

    return await this.solicitudPasswordRepository.listarSolicitudes(estado);
  }

  /**
   * Aprobar solicitud y generar contraseña temporal (Exclusivo Superadmin Rol 4)
   */
  async aprobarSolicitud(idSolicitud, { passwordProvisional, notas }, superadminAutenticado) {
    const idSolNum = Number(idSolicitud);
    if (!idSolNum || isNaN(idSolNum)) {
      const error = new Error('ID de solicitud inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (!superadminAutenticado || (superadminAutenticado.idRol !== 4 && superadminAutenticado.IdRol !== 4)) {
      const error = new Error('Acceso denegado: Exclusivo para Superadministradores.');
      error.statusCode = 403;
      throw error;
    }

    const solicitud = await this.solicitudPasswordRepository.buscarPorId(idSolNum);
    if (!solicitud) {
      const error = new Error('La solicitud no existe.');
      error.statusCode = 404;
      throw error;
    }
    if (solicitud.estado !== 'PENDIENTE') throw conflictoResolucion();

    // Usar la contraseña temporal enviada o generar una automática segura
    const passTemporal = (passwordProvisional && passwordProvisional.trim().length >= 8)
      ? passwordProvisional.trim()
      : this.generarPasswordTemporal();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passTemporal, salt);

    const idSuperadmin = superadminAutenticado.idUsuario || superadminAutenticado.IdUsuario;

    const resolucion = await this.solicitudPasswordRepository.resolverSolicitud(idSolNum, {
      idUsuario: solicitud.idUsuario,
      estado: 'APROBADA',
      idSuperadmin,
      nuevoPasswordHash: passwordHash,
      notas: notas || 'Aprobada por Superadministrador municipal'
    });
    if (!resolucion) throw conflictoResolucion();

    return {
      idSolicitud: idSolNum,
      estado: 'APROBADA',
      email: solicitud.email,
      passwordTemporal: passTemporal,
      mensaje: 'Contraseña temporal generada con éxito. Proporciónela al empleado solicitante de manera segura.'
    };
  }

  /**
   * Rechazar solicitud de reseteo (Exclusivo Superadmin Rol 4)
   */
  async rechazarSolicitud(idSolicitud, { motivo }, superadminAutenticado) {
    const idSolNum = Number(idSolicitud);
    if (!idSolNum || isNaN(idSolNum)) {
      const error = new Error('ID de solicitud inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (!superadminAutenticado || (superadminAutenticado.idRol !== 4 && superadminAutenticado.IdRol !== 4)) {
      const error = new Error('Acceso denegado: Exclusivo para Superadministradores.');
      error.statusCode = 403;
      throw error;
    }

    if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 5) {
      const error = new Error('Debe proporcionar un motivo de rechazo de al menos 5 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    const solicitud = await this.solicitudPasswordRepository.buscarPorId(idSolNum);
    if (!solicitud) {
      const error = new Error('La solicitud no existe.');
      error.statusCode = 404;
      throw error;
    }
    if (solicitud.estado !== 'PENDIENTE') throw conflictoResolucion();

    const idSuperadmin = superadminAutenticado.idUsuario || superadminAutenticado.IdUsuario;

    const resolucion = await this.solicitudPasswordRepository.resolverSolicitud(idSolNum, {
      idUsuario: solicitud.idUsuario,
      estado: 'RECHAZADA',
      idSuperadmin,
      notas: motivo.trim()
    });
    if (!resolucion) throw conflictoResolucion();

    return {
      idSolicitud: idSolNum,
      estado: 'RECHAZADA',
      motivo: motivo.trim()
    };
  }
}

module.exports = PasswordRecoveryService;
