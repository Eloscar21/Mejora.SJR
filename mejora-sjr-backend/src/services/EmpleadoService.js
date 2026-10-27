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
    if (!nombre || !email || !password || idRol === undefined) {
      const error = new Error('Los campos nombre, email, password e idRol son requeridos.');
      error.statusCode = 400;
      throw error;
    }

    const rolNum = Number(idRol);
    let deptoNum = idDepartamento !== null && idDepartamento !== undefined ? Number(idDepartamento) : null;

    // Regla RBAC: Admin Depto (Rol 3) solo puede crear empleados para su propio departamento
    if (usuarioAutenticado && usuarioAutenticado.idRol === 3) {
      if (rolNum !== 2) {
        const error = new Error('Los Administradores departamentales solo pueden registrar Trabajadores de Campo (Rol 2).');
        error.statusCode = 403;
        throw error;
      }
      deptoNum = usuarioAutenticado.idDepartamento;
    }

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
   * Listar empleados activos respetando el scope de departamento (RBAC)
   */
  async listarEmpleados(usuarioAutenticado) {
    const filtros = { roles: [2, 3] };

    // Si es Admin de Departamento (Rol 3), filtra forzosamente por su propio departamento
    if (usuarioAutenticado && usuarioAutenticado.idRol === 3) {
      filtros.idDepartamento = usuarioAutenticado.idDepartamento;
    }

    return await this.usuarioRepository.listarEmpleadosActivos(filtros);
  }

  /**
   * Actualizar nombre, rol o departamento de un empleado
   */
  async actualizarEmpleado(idUsuario, { nombre, idRol, idDepartamento }, usuarioAutenticado) {
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
    let deptoNum = idDepartamento !== null && idDepartamento !== undefined ? Number(idDepartamento) : null;

    // Control RBAC: Si es Admin Depto (Rol 3)
    if (usuarioAutenticado && usuarioAutenticado.idRol === 3) {
      if (empleadoExistente.idDepartamento !== usuarioAutenticado.idDepartamento) {
        const error = new Error('No tienes permisos para modificar empleados de otro departamento.');
        error.statusCode = 403;
        throw error;
      }
      if (rolNum !== 2) {
        const error = new Error('Los Administradores departamentales solo pueden mantener el rol de Trabajador (Rol 2).');
        error.statusCode = 403;
        throw error;
      }
      deptoNum = usuarioAutenticado.idDepartamento;
    }

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

    // Control RBAC
    if (usuarioAutenticado && usuarioAutenticado.idRol === 3) {
      if (empleadoExistente.idDepartamento !== usuarioAutenticado.idDepartamento) {
        const error = new Error('No tienes permisos para desactivar empleados de otro departamento.');
        error.statusCode = 403;
        throw error;
      }
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
