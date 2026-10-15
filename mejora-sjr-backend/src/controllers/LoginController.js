'use strict';
const ValidacionError = require('../errors/ValidacionError');

// COOKIE_NAME debe ser consistente con lo que el middleware de Next.js va a leer.
const COOKIE_NAME = 'mejora_sjr_token';

// Duración de la cookie en ms: alineada con JWT_EXPIRES_IN (8h por defecto)
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

class LoginController {
  constructor({ loginService }) {
    this.loginService = loginService;
    this.login = this.login.bind(this);
  }

  async login(req, res, next) {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object') {
        throw new ValidacionError('El cuerpo de la petición es obligatorio');
      }

      const { email, password, canal = 'web' } = body;
      if (!email || !password) {
        throw new ValidacionError('Los campos email y password son obligatorios');
      }

      // El servicio valida, autentica y devuelve el JWT firmado
      const token = await this.loginService.login({ email, password, canal });

      res.set('Cache-Control', 'no-store');
      if (canal === 'movil') {
        return res.status(200).json({ mensaje: 'Login exitoso', token });
      }

      // Responsabilidad del controlador: saber cómo transportar el token al cliente.
      // HttpOnly: JavaScript del browser NO puede leerla → protección contra XSS.
      // Secure: solo se envía por HTTPS (desactivado en dev con NODE_ENV check).
      // SameSite=Strict: protección contra CSRF.
      res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: COOKIE_MAX_AGE_MS,
        path: '/'
      });

      return res.status(200).json({
        mensaje: 'Login exitoso'
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = LoginController;
