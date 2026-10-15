'use strict';
const CredencialesInvalidasError = require('../errors/CredencialesInvalidasError');
const ValidacionError = require('../errors/ValidacionError');

const EMAIL_FORMATO_BASICO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LONGITUD_TEXTO = 150;

class LoginService {
  /**
   * @param {object} deps
   * @param {import('../repositories/IUsuarioRepository')} deps.usuarioRepository
   * @param {{ compare: Function }} deps.hasher          - Adaptador bcrypt (inyectado)
   * @param {{ sign: Function }}   deps.tokenSigner      - Adaptador JWT  (inyectado)
   */
  constructor({ usuarioRepository, hasher, tokenSigner }) {
    this.usuarioRepository = usuarioRepository;
    this.hasher = hasher;
    this.tokenSigner = tokenSigner;
  }

  /**
   * Valida credenciales y devuelve un JWT firmado.
   * @param {{ email: string, password: string }} credenciales
   * @returns {Promise<string>} token JWT
   */
  async login({ email, password }) {
    // --- Validación de entrada ---
    const emailNormalizado = this._normalizarEmail(email);

    if (typeof password !== 'string' || password.trim().length === 0) {
      throw new ValidacionError('La contraseña es obligatoria');
    }

    // --- Búsqueda del usuario (incluye hash para comparar) ---
    const usuario = await this.usuarioRepository.buscarPorEmailConHash(emailNormalizado);

    // Tiempo constante: si no existe el usuario, igual comparamos un hash vacío
    // para no revelar por timing si el email existe o no.
    const hashAComparar = usuario ? usuario.PasswordHash : '$2b$10$invalidhashpaddingtoconstanttime';
    const coincide = await this.hasher.compare(password, hashAComparar);

    if (!usuario || !coincide) {
      throw new CredencialesInvalidasError();
    }

    // --- Solo roles web pueden acceder al dashboard ---
    // IdRol 1 (ciudadano) y 2 (trabajador) son exclusivos de la app móvil.
    if (usuario.IdRol === 1 || usuario.IdRol === 2) {
      throw new CredencialesInvalidasError();
    }

    // --- Firma del JWT ---
    // El payload no debe contener datos sensibles (ej. PasswordHash).
    const payload = {
      sub: usuario.IdUsuario,
      nombre: usuario.Nombre,
      idRol: usuario.IdRol,
      idDepartamento: usuario.IdDepartamento ?? null
    };

    const token = this.tokenSigner.sign(payload);
    return token;
  }

  _normalizarEmail(email) {
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new ValidacionError('El correo es obligatorio');
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

module.exports = LoginService;
