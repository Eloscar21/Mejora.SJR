// src/repositories/MockSolicitudPasswordRepository.js
'use strict';

const ISolicitudPasswordRepository = require('./ISolicitudPasswordRepository');

/**
 * Repositorio en memoria para Pruebas Unitarias de Solicitudes de Password (US-028)
 */
class MockSolicitudPasswordRepository extends ISolicitudPasswordRepository {
  constructor(usuarioRepository, semillas = []) {
    super();
    this.usuarioRepository = usuarioRepository;
    this.solicitudes = [...semillas];
    this.nextId = this.solicitudes.length + 1;
  }

  async crearSolicitud({ idUsuario, email }) {
    // Sin await entre buscar y crear: las llamadas concurrentes reutilizan la pendiente.
    const existente = this.solicitudes.find(s => s.idUsuario === Number(idUsuario) && s.estado === 'PENDIENTE');
    if (existente) return { ...existente };

    const nueva = {
      idSolicitud: this.nextId++,
      idUsuario: Number(idUsuario),
      email: email.trim().toLowerCase(),
      estado: 'PENDIENTE',
      fechaSolicitud: new Date(),
      fechaResolucion: null,
      idSuperadminResolutor: null,
      notasResolucion: null
    };
    this.solicitudes.push(nueva);
    return { ...nueva };
  }

  async listarSolicitudes(estado) {
    return this.solicitudes
      .filter(s => (estado ? s.estado === estado.toUpperCase() : true))
      .map(s => {
        let nombreUsuario = 'Usuario Mock';
        let rolNombre = 'Trabajador';
        let idRol = 2;
        let idDepartamento = 1;
        let departamentoNombre = 'JAPAM';

        if (this.usuarioRepository && Array.isArray(this.usuarioRepository.usuarios)) {
          const user = this.usuarioRepository.usuarios.find(u => u.idUsuario === s.idUsuario);
          if (user) {
            nombreUsuario = user.nombre;
            idRol = user.idRol;
            rolNombre = user.idRol === 2 ? 'Trabajador' : (user.idRol === 3 ? 'Admin' : 'Superadmin');
            idDepartamento = user.idDepartamento;
            departamentoNombre = user.idDepartamento === 1 ? 'JAPAM' : 'Servicios Públicos';
          }
        }

        return {
          ...s,
          nombreUsuario,
          idRol,
          rolNombre,
          idDepartamento,
          departamentoNombre
        };
      });
  }

  async buscarPorId(idSolicitud) {
    const s = this.solicitudes.find(item => item.idSolicitud === Number(idSolicitud));
    if (!s) return null;
    return { ...s };
  }

  async resolverSolicitud(idSolicitud, { idUsuario, estado, idSuperadmin, nuevoPasswordHash, notas }) {
    const s = this.solicitudes.find(item => item.idSolicitud === Number(idSolicitud));
    if (!s || s.estado !== 'PENDIENTE' || s.idUsuario !== Number(idUsuario)) return null;

    // Preparar los valores antes de escribir. No hay await entre comprobar y resolver.
    const resolucion = {
      estado: estado.toUpperCase(),
      fechaResolucion: new Date(),
      idSuperadminResolutor: Number(idSuperadmin),
      notasResolucion: notas ? notas.trim() : null,
    };
    if (estado === 'APROBADA' && nuevoPasswordHash) {
      const user = this.usuarioRepository?.usuarios?.find(u => u.idUsuario === s.idUsuario);
      if (!user) throw new Error('No se pudo actualizar la contraseña del solicitante.');
      user.passwordHash = nuevoPasswordHash;
    }
    Object.assign(s, resolucion);

    return { ...s };
  }
}

module.exports = MockSolicitudPasswordRepository;
