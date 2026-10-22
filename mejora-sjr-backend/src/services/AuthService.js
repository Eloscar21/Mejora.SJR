// src/services/AuthService.js
'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
  /**
   * @param {import('../repositories/IUsuarioRepository')} usuarioRepository - Inyección de dependencias (DIP)
   * @param {string} [jwtSecret] - Secreto JWT inyectable o leído de process.env.JWT_SECRET
   */
  constructor(usuarioRepository, jwtSecret = process.env.JWT_SECRET) {
    if (!usuarioRepository) {
      throw new Error('usuarioRepository es requerido en AuthService.');
    }

    // Validación Fail-Fast: Rechaza ausentes, no-strings, vacíos o compuestos solo por espacios
    if (typeof jwtSecret !== 'string' || jwtSecret.trim().length === 0) {
      throw new Error('JWT_SECRET no está configurado o es inválido en las variables de entorno.');
    }

    this.usuarioRepository = usuarioRepository;
    this.jwtSecret = jwtSecret.trim();
  }

  async registrarCiudadano({ nombre, email, password }) {
    if (!nombre || !email || !password) {
      const error = new Error('Todos los campos son requeridos: nombre, email, password.');
      error.statusCode = 400;
      throw error;
    }

    const emailNormalizado = email.trim().toLowerCase();
    const usuarioExistente = await this.usuarioRepository.buscarPorEmail(emailNormalizado);

    if (usuarioExistente) {
      const error = new Error('El correo electrónico ya está registrado.');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Regla de Negocio Crítica: El registro público siempre es Ciudadano (Rol 1, Depto null)
    const nuevoUsuario = await this.usuarioRepository.crearUsuario({
      nombre: nombre.trim(),
      email: emailNormalizado,
      passwordHash,
      idRol: 1,
      idDepartamento: null
    });

    const token = this._generarToken(nuevoUsuario);

    return {
      usuario: {
        idUsuario: nuevoUsuario.idUsuario,
        nombre: nuevoUsuario.nombre,
        email: nuevoUsuario.email,
        idRol: nuevoUsuario.idRol,
        idDepartamento: nuevoUsuario.idDepartamento
      },
      token
    };
  }

  async login({ email, password }) {
    if (!email || !password) {
      const error = new Error('Email y password son requeridos.');
      error.statusCode = 400;
      throw error;
    }

    const emailNormalizado = email.trim().toLowerCase();
    const usuario = await this.usuarioRepository.buscarPorEmail(emailNormalizado);

    if (!usuario) {
      const error = new Error('Credenciales inválidas.');
      error.statusCode = 401;
      throw error;
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      const error = new Error('Credenciales inválidas.');
      error.statusCode = 401;
      throw error;
    }

    const token = this._generarToken(usuario);

    return {
      usuario: {
        idUsuario: usuario.idUsuario,
        nombre: usuario.nombre,
        email: usuario.email,
        idRol: usuario.idRol,
        idDepartamento: usuario.idDepartamento
      },
      token
    };
  }

  _generarToken(usuario) {
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

    return jwt.sign(
      {
        idUsuario: usuario.idUsuario,
        email: usuario.email,
        idRol: usuario.idRol,
        idDepartamento: usuario.idDepartamento
      },
      this.jwtSecret,
      { expiresIn }
    );
  }
}

module.exports = AuthService;
