// src/repositories/MockUsuarioRepository.js
'use strict';

const bcrypt = require('bcryptjs');
const IUsuarioRepository = require('./IUsuarioRepository');

class MockUsuarioRepository extends IUsuarioRepository {
  constructor() {
    super();
    // Hash síncrono precalculado para 'Password123!'
    const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

    this.usuarios = [
      {
        idUsuario: 1,
        nombre: 'Ciudadano Juan',
        email: 'ciudadano@test.com',
        passwordHash: defaultPasswordHash,
        idRol: 1,
        idDepartamento: null,
        activo: 1
      },
      {
        idUsuario: 2,
        nombre: 'Trabajador Pedro',
        email: 'trabajador@test.com',
        passwordHash: defaultPasswordHash,
        idRol: 2,
        idDepartamento: 1, // JAPAM
        activo: 1
      },
      {
        idUsuario: 3,
        nombre: 'Admin Maria',
        email: 'admin@test.com',
        passwordHash: defaultPasswordHash,
        idRol: 3,
        idDepartamento: 2, // Servicios Públicos
        activo: 1
      },
      {
        idUsuario: 4,
        nombre: 'Superadmin Carlos',
        email: 'superadmin@test.com',
        passwordHash: defaultPasswordHash,
        idRol: 4,
        idDepartamento: null,
        activo: 1
      }
    ];
  }

  async buscarPorEmail(email) {
    if (!email) return null;
    const usuario = this.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    return usuario ? { ...usuario } : null;
  }

  async crearUsuario({ nombre, email, passwordHash, idRol, idDepartamento, activo = 1 }) {
    // Validar constraint CHK_Usuario_Depto
    if ((idRol === 2 || idRol === 3) && !idDepartamento) {
      throw new Error('Trabajadores y Administradores deben tener un departamento asignado.');
    }
    if ((idRol === 1 || idRol === 4) && idDepartamento !== null && idDepartamento !== undefined) {
      throw new Error('Ciudadanos y Superadministradores no deben tener departamento.');
    }

    const nuevoUsuario = {
      idUsuario: this.usuarios.length + 1,
      nombre,
      email: email.toLowerCase(),
      passwordHash,
      idRol,
      idDepartamento: idDepartamento || null,
      activo: activo !== undefined ? (activo ? 1 : 0) : 1
    };

    this.usuarios.push(nuevoUsuario);
    return { ...nuevoUsuario };
  }

  async buscarPorId(idUsuario) {
    const usuario = this.usuarios.find(u => u.idUsuario === Number(idUsuario));
    return usuario ? { ...usuario } : null;
  }

  async listarEmpleadosActivos({ roles = [2, 3], idDepartamento } = {}) {
    return this.usuarios
      .filter(u => {
        const esActivo = u.activo === 1;
        const cumpleRol = roles.includes(u.idRol);
        const cumpleDepto = idDepartamento ? u.idDepartamento === Number(idDepartamento) : true;
        return esActivo && cumpleRol && cumpleDepto;
      })
      .map(({ passwordHash, ...safeUser }) => ({ ...safeUser }));
  }

  async actualizarEmpleado(idUsuario, { nombre, idRol, idDepartamento }) {
    const usuarioIndex = this.usuarios.findIndex(u => u.idUsuario === Number(idUsuario));
    if (usuarioIndex === -1) return null;

    // Validar constraint de departamento
    if ((idRol === 2 || idRol === 3) && !idDepartamento) {
      throw new Error('Trabajadores y Administradores deben tener un departamento asignado.');
    }
    if ((idRol === 1 || idRol === 4) && idDepartamento !== null && idDepartamento !== undefined) {
      throw new Error('Ciudadanos y Superadministradores no deben tener departamento.');
    }

    const target = this.usuarios[usuarioIndex];
    target.nombre = nombre !== undefined ? nombre.trim() : target.nombre;
    target.idRol = idRol !== undefined ? Number(idRol) : target.idRol;
    target.idDepartamento = idDepartamento !== undefined ? (idDepartamento ? Number(idDepartamento) : null) : target.idDepartamento;

    const { passwordHash, ...safeUser } = target;
    return { ...safeUser };
  }

  async desactivarEmpleado(idUsuario) {
    const usuario = this.usuarios.find(u => u.idUsuario === Number(idUsuario));
    if (!usuario) return false;
    usuario.activo = 0;
    return true;
  }
}

module.exports = MockUsuarioRepository;
