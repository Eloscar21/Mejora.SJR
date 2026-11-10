// src/services/PasswordRecoveryService.js
'use strict';

const bcrypt = require('bcryptjs');

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
   * Genera una contraseña aleatoria provisional segura
   * Longitud 10 caracteres con mayúscula, minúscula, número y símbolo
   */
  generarPasswordTemporal() {
    const charsMayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const charsMinus = 'abcdefghijkmnpqrstuvwxyz';
    const charsNums = '23456789';
    const charsSimbolos = '!@#$%&*';

    let pass = '';
    pass += charsMayus.charAt(Math.floor(Math.random() * charsMayus.length));
    pass += charsMinus.charAt(Math.floor(Math.random() * charsMinus.length));
    pass += charsNums.charAt(Math.floor(Math.random() * charsNums.length));
    pass += charsSimbolos.charAt(Math.floor(Math.random() * charsSimbolos.length));

    const todos = charsMayus + charsMinus + charsNums + charsSimbolos;
    for (let i = 0; i < 6; i++) {
      pass += todos.charAt(Math.floor(Math.random() * todos.length));
    }
    return pass;
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
      // Verificar si ya existe solicitud pendiente
      const existentes = await this.solicitudPasswordRepository.listarSolicitudes('PENDIENTE');
      const yaExiste = existentes.some(s => s.idUsuario === usuario.idUsuario);
      if (!yaExiste) {
        await this.solicitudPasswordRepository.crearSolicitud({
          idUsuario: usuario.idUsuario,
          email: emailNormalizado
        });
      }
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
    if (!solicitud || solicitud.estado !== 'PENDIENTE') {
      const error = new Error('La solicitud no existe o ya ha sido resuelta.');
      error.statusCode = 404;
      throw error;
    }

    // Usar la contraseña temporal enviada o generar una automática segura
    const passTemporal = (passwordProvisional && passwordProvisional.trim().length >= 8)
      ? passwordProvisional.trim()
      : this.generarPasswordTemporal();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passTemporal, salt);

    const idSuperadmin = superadminAutenticado.idUsuario || superadminAutenticado.IdUsuario;

    await this.solicitudPasswordRepository.resolverSolicitud(idSolNum, {
      estado: 'APROBADA',
      idSuperadmin,
      nuevoPasswordHash: passwordHash,
      notas: notas || 'Aprobada por Superadministrador municipal'
    });

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
    if (!solicitud || solicitud.estado !== 'PENDIENTE') {
      const error = new Error('La solicitud no existe o ya ha sido resuelta.');
      error.statusCode = 404;
      throw error;
    }

    const idSuperadmin = superadminAutenticado.idUsuario || superadminAutenticado.IdUsuario;

    const res = await this.solicitudPasswordRepository.resolverSolicitud(idSolNum, {
      estado: 'RECHAZADA',
      idSuperadmin,
      notas: motivo.trim()
    });

    return {
      idSolicitud: idSolNum,
      estado: 'RECHAZADA',
      motivo: motivo.trim()
    };
  }
}

module.exports = PasswordRecoveryService;
