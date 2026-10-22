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
        idDepartamento: null
      },
      {
        idUsuario: 2,
        nombre: 'Trabajador Pedro',
        email: 'trabajador@test.com',
        passwordHash: defaultPasswordHash,
        idRol: 2,
        idDepartamento: 1 // JAPAM
      },
      {
        idUsuario: 3,
        nombre: 'Admin Maria',
        email: 'admin@test.com',
        passwordHash: defaultPasswordHash,
        idRol: 3,
        idDepartamento: 2 // Servicios Públicos
      },
      {
        idUsuario: 4,
        nombre: 'Superadmin Carlos',
        email: 'superadmin@test.com',
        passwordHash: defaultPasswordHash,
        idRol: 4,
        idDepartamento: null
      }
    ];
  }

  async buscarPorEmail(email) {
    if (!email) return null;
    const usuario = this.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    return usuario ? { ...usuario } : null;
  }

  async crearUsuario({ nombre, email, passwordHash, idRol, idDepartamento }) {
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
      idDepartamento: idDepartamento || null
    };

    this.usuarios.push(nuevoUsuario);
    return { ...nuevoUsuario };
  }

  async buscarPorId(idUsuario) {
    const usuario = this.usuarios.find(u => u.idUsuario === Number(idUsuario));
    return usuario ? { ...usuario } : null;
  }
}

module.exports = MockUsuarioRepository;
