'use strict';
const CredencialesInvalidasError = require('../errors/CredencialesInvalidasError');

class RenovacionService {
  constructor({ usuarioRepository, tokenSigner }) {
    this.usuarioRepository = usuarioRepository;
    this.tokenSigner = tokenSigner;
  }

  async renovar(token) {
    let payload;
    try {
      payload = this.tokenSigner.verify(token);
    } catch (error) {
      if (['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name)) {
        throw new CredencialesInvalidasError();
      }
      throw error; // Un fallo de configuración no es una credencial inválida.
    }
    if (!payload || payload.canal !== 'movil' || !Number.isInteger(payload.sub)
      || payload.sub <= 0 || !Number.isFinite(payload.exp)) {
      throw new CredencialesInvalidasError();
    }
    const usuario = await this.usuarioRepository.buscarPorId(payload.sub);
    if (!usuario || ![1, 2].includes(usuario.IdRol)) throw new CredencialesInvalidasError();
    // Reconstruimos desde BD: no copiamos exp, iat ni permisos enviados por el cliente.
    return this.tokenSigner.sign({
      sub: usuario.IdUsuario, nombre: usuario.Nombre, idRol: usuario.IdRol,
      idDepartamento: usuario.IdDepartamento ?? null, canal: 'movil'
    });
  }
}
module.exports = RenovacionService;
