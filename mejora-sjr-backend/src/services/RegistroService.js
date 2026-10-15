'use strict';
const EmailDuplicadoError = require('../errors/EmailDuplicadoError');
const ValidacionError = require('../errors/ValidacionError');

const MAX_LONGITUD_TEXTO = 150; // Alineado con VARCHAR(150) de Usuarios.Nombre y Usuarios.Email
const PASSWORD_MIN_CARACTERES = 8;
const PASSWORD_MAX_CARACTERES = 64;
const PASSWORD_MAX_BYTES = 72; // Límite de bcrypt: más allá se trunca en silencio
const EMAIL_FORMATO_BASICO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class RegistroService {
  constructor({ usuarioRepository, hasher }) {
    this.usuarioRepository = usuarioRepository;
    this.hasher = hasher;
  }

  async registrar(datos) {
    if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
      throw new ValidacionError('Los datos de registro son obligatorios');
    }
    const { nombre, email, password } = datos;

    this._validarPassword(password);
    const nombreNormalizado = this._normalizarNombre(nombre);
    const emailNormalizado = this._normalizarEmail(email);

    const existente = await this.usuarioRepository.buscarPorEmail(emailNormalizado);
    if (existente !== null) {
      throw new EmailDuplicadoError();
    }

    const passwordHash = await this.hasher.hash(password);

    const usuarioParaCrear = Object.freeze({
      nombre: nombreNormalizado,
      email: emailNormalizado,
      passwordHash,
      idRol: 1,
      idDepartamento: null
    });

    await this.usuarioRepository.crear(usuarioParaCrear);
  }

  _validarPassword(password) {
    if (typeof password !== 'string') {
      throw new ValidacionError('La contraseña debe ser un texto');
    }
    // La contraseña NUNCA se recorta ni se normaliza: los espacios son parte de su entropía
    if (password.length < PASSWORD_MIN_CARACTERES || password.length > PASSWORD_MAX_CARACTERES) {
      throw new ValidacionError('La contraseña debe tener entre 8 y 64 caracteres');
    }
    if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
      throw new ValidacionError('La contraseña excede el límite de tamaño seguro');
    }
  }

  _normalizarNombre(nombre) {
    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      throw new ValidacionError('El nombre es obligatorio y debe ser un texto');
    }
    const normalizado = nombre.trim();
    if (normalizado.length > MAX_LONGITUD_TEXTO) {
      throw new ValidacionError('El nombre no puede exceder 150 caracteres');
    }
    return normalizado;
  }

  _normalizarEmail(email) {
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new ValidacionError('El correo es obligatorio y debe ser un texto');
    }
    const normalizado = email.trim().toLowerCase();
    if (normalizado.length > MAX_LONGITUD_TEXTO) {
      throw new ValidacionError('El correo no puede exceder 150 caracteres');
    }
    if (!EMAIL_FORMATO_BASICO.test(normalizado)) {
      throw new ValidacionError('El correo no tiene un formato válido');
    }
    return normalizado;
  }
}

module.exports = RegistroService;
