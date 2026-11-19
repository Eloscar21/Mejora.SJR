// src/services/PerfilService.js
'use strict';

const bcrypt = require('bcryptjs');

const NOMBRES_ROLES = {
  1: 'Ciudadano',
  2: 'Trabajador de Campo',
  3: 'Administrador de Departamento',
  4: 'Superadmin / Alcaldía',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class PerfilService {
  /**
   * @param {import('../repositories/IUsuarioRepository') & import('../repositories/IUsuarioPasswordRepository')} usuarioRepository
   * @param {import('../repositories/IIncidenciaRepository')} [incidenciaRepository]
   */
  constructor(usuarioRepository, incidenciaRepository = null) {
    if (!usuarioRepository) {
      throw new Error('usuarioRepository es requerido en PerfilService.');
    }
    this.usuarioRepository = usuarioRepository;
    this.incidenciaRepository = incidenciaRepository;
  }

  /**
   * Obtiene el perfil completo del usuario autenticado ("Mis Datos" - US-032)
   */
  async obtenerPerfil(usuarioAutenticado) {
    const idUsuario = Number(usuarioAutenticado?.idUsuario);
    if (!idUsuario || !Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      const error = new Error('No se pudo identificar la sesión del usuario.');
      error.statusCode = 401;
      throw error;
    }

    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuario || (usuario.activo !== 1 && usuario.activo !== true)) {
      const error = new Error('La cuenta de usuario no existe o se encuentra inactiva.');
      error.statusCode = 404;
      throw error;
    }

    let resumenReportes = {
      total: 0,
      recibidos: 0,
      enProceso: 0,
      resueltos: 0,
    };

    if (
      this.incidenciaRepository &&
      typeof this.incidenciaRepository.listarIncidencias === 'function'
    ) {
      try {
        const misReportes = await this.incidenciaRepository.listarIncidencias({ idUsuario });
        if (Array.isArray(misReportes)) {
          resumenReportes = {
            total: misReportes.length,
            recibidos: misReportes.filter((r) => Number(r.idEstado) === 1).length,
            enProceso: misReportes.filter(
              (r) => Number(r.idEstado) === 2 || Number(r.idEstado) === 3
            ).length,
            resueltos: misReportes.filter((r) => Number(r.idEstado) === 4).length,
          };
        }
      } catch {
        // Si el repositorio de incidencias no responde, se conserva el resumen en 0
      }
    }

    return {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      email: usuario.email,
      idRol: usuario.idRol,
      rolNombre: NOMBRES_ROLES[usuario.idRol] || 'Ciudadano',
      idDepartamento: usuario.idDepartamento ?? null,
      activo: usuario.activo === 1 || usuario.activo === true,
      resumenReportes,
    };
  }

  /**
   * Actualiza los datos personales ("Mis Datos" - US-032) del ciudadano / usuario autenticado.
   * Soporta actualización de nombre, correo electrónico y cambio opcional de contraseña.
   */
  async actualizarPerfil(
    { nombre, email, passwordActual, passwordNueva, confirmarPassword } = {},
    usuarioAutenticado
  ) {
    const idUsuario = Number(usuarioAutenticado?.idUsuario);
    if (!idUsuario || !Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
      const error = new Error('No se pudo identificar la sesión del usuario.');
      error.statusCode = 401;
      throw error;
    }

    const usuarioActual = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuarioActual || (usuarioActual.activo !== 1 && usuarioActual.activo !== true)) {
      const error = new Error('La cuenta de usuario no existe o se encuentra inactiva.');
      error.statusCode = 404;
      throw error;
    }

    // 1. Validación de nombre
    const nombreLimpio =
      typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '';
    if (nombreLimpio.length < 3 || nombreLimpio.length > 150) {
      const error = new Error('El nombre completo debe tener entre 3 y 150 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validación de correo electrónico
    const emailFinal =
      typeof email === 'string' && email.trim().length > 0
        ? email.trim().toLowerCase()
        : usuarioActual.email.toLowerCase();

    if (!EMAIL_REGEX.test(emailFinal) || emailFinal.length > 150) {
      const error = new Error('El formato del correo electrónico no es válido.');
      error.statusCode = 400;
      throw error;
    }

    if (emailFinal !== usuarioActual.email.toLowerCase()) {
      const existente = await this.usuarioRepository.buscarPorEmail(emailFinal);
      if (existente && Number(existente.idUsuario) !== idUsuario) {
        const error = new Error('El correo electrónico ya está registrado por otra cuenta.');
        error.statusCode = 409;
        throw error;
      }
    }

    // 3. Cambio opcional de contraseña desde "Mis Datos"
    let nuevoPasswordHash = null;
    const solicitaCambioPassword =
      (typeof passwordNueva === 'string' && passwordNueva.length > 0) ||
      (typeof confirmarPassword === 'string' && confirmarPassword.length > 0) ||
      (typeof passwordActual === 'string' && passwordActual.length > 0);

    if (solicitaCambioPassword) {
      if (
        typeof passwordActual !== 'string' ||
        passwordActual.length === 0 ||
        typeof passwordNueva !== 'string' ||
        typeof confirmarPassword !== 'string'
      ) {
        const error = new Error(
          'Para actualizar tu contraseña debes ingresar la contraseña actual, la nueva y su confirmación.'
        );
        error.statusCode = 400;
        throw error;
      }

      if (
        Array.from(passwordNueva).length < 8 ||
        passwordNueva.trim().length === 0 ||
        Buffer.byteLength(passwordNueva, 'utf8') > 72
      ) {
        const error = new Error('La nueva contraseña debe tener al menos 8 caracteres.');
        error.statusCode = 400;
        throw error;
      }

      if (passwordNueva !== confirmarPassword) {
        const error = new Error('La confirmación no coincide con la nueva contraseña.');
        error.statusCode = 400;
        throw error;
      }

      let credenciales = null;
      if (typeof this.usuarioRepository.obtenerCredencialesPorId === 'function') {
        credenciales = await this.usuarioRepository.obtenerCredencialesPorId(idUsuario);
      } else {
        credenciales = await this.usuarioRepository.buscarPorEmail(usuarioActual.email);
      }

      if (!credenciales || !credenciales.passwordHash) {
        const error = new Error('No se pudieron verificar las credenciales actuales.');
        error.statusCode = 401;
        throw error;
      }

      const coincideActual = await bcrypt.compare(passwordActual, credenciales.passwordHash);
      if (!coincideActual) {
        const error = new Error('La contraseña actual es incorrecta.');
        error.statusCode = 400;
        throw error;
      }

      const esIgual = await bcrypt.compare(passwordNueva, credenciales.passwordHash);
      if (esIgual) {
        const error = new Error('La nueva contraseña debe ser diferente de la actual.');
        error.statusCode = 400;
        throw error;
      }

      nuevoPasswordHash = await bcrypt.hash(passwordNueva, 10);
    }

    // 4. Persistir actualización de perfil
    const actualizado = await this.usuarioRepository.actualizarPerfilUsuario(idUsuario, {
      nombre: nombreLimpio,
      email: emailFinal,
      passwordHash: nuevoPasswordHash,
    });

    if (!actualizado) {
      const error = new Error('No fue posible actualizar los datos del perfil.');
      error.statusCode = 500;
      throw error;
    }

    const perfilEnriquecido = await this.obtenerPerfil({ idUsuario });
    return {
      mensaje: solicitaCambioPassword
        ? 'Tus datos personales y contraseña se actualizaron correctamente.'
        : 'Tus datos personales se actualizaron correctamente.',
      usuario: perfilEnriquecido,
    };
  }
}

module.exports = PerfilService;
