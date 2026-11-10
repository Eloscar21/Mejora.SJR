// src/services/EmpleadoService.js
'use strict';

const bcrypt = require('bcryptjs');

class EmpleadoService {
  /**
   * @param {import('../repositories/IUsuarioRepository')} usuarioRepository - Inyección de dependencias (DIP)
   */
  constructor(usuarioRepository) {
    if (!usuarioRepository) {
      throw new Error('usuarioRepository es requerido en EmpleadoService.');
    }
    this.usuarioRepository = usuarioRepository;
  }

  /** La gestión de cuentas está reservada al Superadmin, también fuera de HTTP. */
  _exigirSuperadmin(usuarioAutenticado) {
    if (!usuarioAutenticado || usuarioAutenticado.idRol !== 4) {
      const error = new Error('Solo el Superadmin puede crear, editar o desactivar empleados.');
      error.statusCode = 403;
      throw error;
    }
  }

  /**
   * Valida la regla de departamento según rol:
   * - Rol 2 (Trabajador) y Rol 3 (Admin): OBLIGATORIO tener idDepartamento (1 o 2).
   * - Rol 1 (Ciudadano) y Rol 4 (Superadmin): NO pueden tener departamento.
   */
  _validarDeptoPorRol(idRol, idDepartamento) {
    const rolNum = Number(idRol);
    const deptoNum = idDepartamento !== null && idDepartamento !== undefined ? Number(idDepartamento) : null;

    if (rolNum === 2 || rolNum === 3) {
      if (!deptoNum || (deptoNum !== 1 && deptoNum !== 2)) {
        const error = new Error('Los Trabajadores (Rol 2) y Administradores (Rol 3) deben tener un departamento válido asignado (1: JAPAM, 2: Servicios Públicos).');
        error.statusCode = 400;
        throw error;
      }
    } else if (rolNum === 1 || rolNum === 4) {
      if (deptoNum !== null) {
        const error = new Error('Ciudadanos y Superadministradores no deben tener departamento asignado.');
        error.statusCode = 400;
        throw error;
      }
    } else {
      const error = new Error(`Rol ${idRol} no válido para empleados.`);
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Crear nuevo empleado en la base de datos
   */
  async crearEmpleado({ nombre, email, password, idRol, idDepartamento }, usuarioAutenticado) {
    this._exigirSuperadmin(usuarioAutenticado);

    if (!nombre || !email || !password || idRol === undefined) {
      const error = new Error('Los campos nombre, email, password e idRol son requeridos.');
      error.statusCode = 400;
      throw error;
    }

    const rolNum = Number(idRol);
    const deptoNum = idDepartamento !== null && idDepartamento !== undefined ? Number(idDepartamento) : null;

    // Validar concordancia de departamento
    this._validarDeptoPorRol(rolNum, deptoNum);

    const emailNormalizado = email.trim().toLowerCase();
    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(emailNormalizado);

    if (usuarioExistente) {
      const error = new Error('El correo electrónico ya está registrado.');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nuevoEmpleado = await this.usuarioRepository.crearUsuario({
      nombre: nombre.trim(),
      email: emailNormalizado,
      passwordHash,
      idRol: rolNum,
      idDepartamento: deptoNum,
      activo: 1
    });

    const { passwordHash: _, ...empleadoSeguro } = nuevoEmpleado;
    return empleadoSeguro;
  }

  /**
   * Listar empleados respetando el scope de departamento (RBAC Dinámico - US-008 / US-019 / US-020)
   * - Rol 4 (Superadmin): retorna toda la tabla (roles 2 y 3 o según filtros sin forzar depto).
   * - Rol 3 (Admin Depto): inyecta dinámicamente WHERE IdDepartamento = @IdDepto AND IdRol = 2.
   */
  async listarEmpleados(usuarioAutenticado, { soloActivos = false } = {}) {
    const rol = usuarioAutenticado?.idRol ?? usuarioAutenticado?.IdRol;
    if (![3, 4].includes(rol)) {
      const error = new Error('No tienes permisos para consultar empleados.');
      error.statusCode = 403;
      throw error;
    }

    const filtros = { roles: [2, 3], soloActivos };

    // US-021: el administrador solo consulta trabajadores de su propio departamento.
    if (rol === 3) {
      const idDepartamento = usuarioAutenticado.idDepartamento !== undefined
        ? usuarioAutenticado.idDepartamento
        : usuarioAutenticado.IdDepartamento;
      if (!Number.isInteger(idDepartamento) || idDepartamento <= 0) {
        const error = new Error('Tu sesión no tiene un departamento válido para consultar trabajadores.');
        error.statusCode = 403;
        throw error;
      }

      filtros.roles = [2];
      filtros.idDepartamento = idDepartamento;
    }

    if (typeof this.usuarioRepository.obtenerEmpleados === 'function') {
      return await this.usuarioRepository.obtenerEmpleados(filtros);
    }
    return await this.usuarioRepository.listarEmpleadosActivos(filtros);
  }

  /**
   * Actualizar nombre, rol o departamento de un empleado
   */
  async actualizarEmpleado(idUsuario, { nombre, idRol, idDepartamento }, usuarioAutenticado) {
    this._exigirSuperadmin(usuarioAutenticado);

    const idNum = Number(idUsuario);
    if (!idNum || isNaN(idNum)) {
      const error = new Error('ID de usuario inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (!nombre || idRol === undefined) {
      const error = new Error('Los campos nombre e idRol son requeridos.');
      error.statusCode = 400;
      throw error;
    }

    const empleadoExistente = await this.usuarioRepository.buscarPorId(idNum);
    if (!empleadoExistente || empleadoExistente.activo === 0) {
      const error = new Error('Empleado no encontrado o inactivo.');
      error.statusCode = 404;
      throw error;
    }

    const rolNum = Number(idRol);
    const deptoNum = idDepartamento !== null && idDepartamento !== undefined ? Number(idDepartamento) : null;

    this._validarDeptoPorRol(rolNum, deptoNum);

    const empleadoActualizado = await this.usuarioRepository.actualizarEmpleado(idNum, {
      nombre: nombre.trim(),
      idRol: rolNum,
      idDepartamento: deptoNum
    });

    if (!empleadoActualizado) {
      const error = new Error('No se pudo actualizar el empleado.');
      error.statusCode = 500;
      throw error;
    }

    return empleadoActualizado;
  }

  /**
   * Soft Delete: Desactivar empleado cambiando Activo = 0
   */
  async desactivarEmpleado(idUsuario, usuarioAutenticado) {
    this._exigirSuperadmin(usuarioAutenticado);

    const idNum = Number(idUsuario);
    if (!idNum || isNaN(idNum)) {
      const error = new Error('ID de usuario inválido.');
      error.statusCode = 400;
      throw error;
    }

    const empleadoExistente = await this.usuarioRepository.buscarPorId(idNum);
    if (!empleadoExistente || empleadoExistente.activo === 0) {
      const error = new Error('Empleado no encontrado o ya inactivo.');
      error.statusCode = 404;
      throw error;
    }

    // Regla de seguridad: Nadie puede auto-desactivarse
    if (usuarioAutenticado && usuarioAutenticado.idUsuario === idNum) {
      const error = new Error('No puedes desactivar tu propia cuenta de usuario.');
      error.statusCode = 400;
      throw error;
    }

    const exito = await this.usuarioRepository.desactivarEmpleado(idNum);
    if (!exito) {
      const error = new Error('No se pudo desactivar al empleado.');
      error.statusCode = 500;
      throw error;
    }

    return { mensaje: 'Empleado desactivado exitosamente (Soft Delete).' };
  }
}

module.exports = EmpleadoService;
