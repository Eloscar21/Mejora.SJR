// src/services/IncidenciaOperacionService.js
'use strict';

const IIncidenciaOperacionService = require('./contracts/IIncidenciaOperacionService');

class IncidenciaOperacionService extends IIncidenciaOperacionService {
  /**
   * @param {import('../repositories/IIncidenciaRepository')} incidenciaRepository
   * @param {import('../repositories/IUsuarioRepository')} [usuarioRepository]
   */
  constructor(incidenciaRepository, usuarioRepository) {
    super();
    if (!incidenciaRepository) {
      throw new Error('incidenciaRepository es requerido en IncidenciaOperacionService.');
    }
    this.incidenciaRepository = incidenciaRepository;
    this.usuarioRepository = usuarioRepository;
  }

  async asignarTrabajador(idIncidencia, datosTrabajador, usuarioAutenticado) {
    const idIncNum = Number(idIncidencia);
    const idTrabRaw = typeof datosTrabajador === 'object' && datosTrabajador !== null
      ? datosTrabajador.idTrabajador
      : datosTrabajador;
    const idTrabNum = Number(idTrabRaw);

    if (!idIncNum || isNaN(idIncNum)) {
      const error = new Error('ID de incidencia inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (!idTrabNum || isNaN(idTrabNum)) {
      const error = new Error('ID de trabajador inválido.');
      error.statusCode = 400;
      throw error;
    }

    const incidencia = await this.incidenciaRepository.buscarPorId(idIncNum);
    if (!incidencia) {
      const error = new Error('La incidencia indicada no existe.');
      error.statusCode = 404;
      throw error;
    }

    const rol = usuarioAutenticado.idRol || usuarioAutenticado.IdRol;
    const deptoUsuario = usuarioAutenticado.idDepartamento !== undefined
      ? usuarioAutenticado.idDepartamento
      : usuarioAutenticado.IdDepartamento;

    if (rol === 3 && incidencia.idDepartamento !== deptoUsuario) {
      const error = new Error('No tienes permisos para asignar incidencias de otro departamento.');
      error.statusCode = 403;
      throw error;
    }

    if (this.usuarioRepository && typeof this.usuarioRepository.buscarPorId === 'function') {
      const trabajador = await this.usuarioRepository.buscarPorId(idTrabNum);
      if (!trabajador || trabajador.idRol !== 2) {
        const error = new Error('El usuario asignado debe ser un trabajador operativo activo (Rol 2).');
        error.statusCode = 400;
        throw error;
      }
      if (trabajador.idDepartamento !== incidencia.idDepartamento) {
        const error = new Error('El trabajador asignado debe pertenecer al mismo departamento de la incidencia.');
        error.statusCode = 400;
        throw error;
      }
    }

    return await this.incidenciaRepository.asignarTrabajador(idIncNum, idTrabNum, 2);
  }

  async descartarIncidencia(idIncidencia, datosDescarte, usuarioAutenticado) {
    const idIncNum = Number(idIncidencia);
    const motivoRaw = typeof datosDescarte === 'object' && datosDescarte !== null
      ? datosDescarte.motivoRechazo
      : datosDescarte;
    const motivoRechazo = typeof motivoRaw === 'string' ? motivoRaw.trim() : '';

    if (!idIncNum || isNaN(idIncNum)) {
      const error = new Error('ID de incidencia inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (!motivoRechazo || motivoRechazo.length < 5) {
      const error = new Error('Debe proporcionar un motivo de descarte válido de al menos 5 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    const incidencia = await this.incidenciaRepository.buscarPorId(idIncNum);
    if (!incidencia) {
      const error = new Error('La incidencia indicada no existe.');
      error.statusCode = 404;
      throw error;
    }

    const rol = usuarioAutenticado.idRol || usuarioAutenticado.IdRol;
    const deptoUsuario = usuarioAutenticado.idDepartamento !== undefined
      ? usuarioAutenticado.idDepartamento
      : usuarioAutenticado.IdDepartamento;

    if (rol === 3 && incidencia.idDepartamento !== deptoUsuario) {
      const error = new Error('No tienes permisos para descartar incidencias de otro departamento.');
      error.statusCode = 403;
      throw error;
    }

    return await this.incidenciaRepository.descartarIncidencia(idIncNum, motivoRechazo);
  }

  async actualizarEstado(idIncidencia, datosEstado, usuarioAutenticado) {
    const idIncNum = Number(idIncidencia);
    const estadoRaw = typeof datosEstado === 'object' && datosEstado !== null
      ? datosEstado.idEstado
      : datosEstado;
    const nuevoEstado = Number(estadoRaw);

    if (!idIncNum || isNaN(idIncNum)) {
      const error = new Error('ID de incidencia inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (!nuevoEstado || ![1, 2, 3, 4, 5].includes(nuevoEstado)) {
      const error = new Error('El estado proporcionado no es válido.');
      error.statusCode = 400;
      throw error;
    }

    const incidencia = await this.incidenciaRepository.buscarPorId(idIncNum);
    if (!incidencia) {
      const error = new Error('La incidencia indicada no existe.');
      error.statusCode = 404;
      throw error;
    }

    const rol = usuarioAutenticado.idRol || usuarioAutenticado.IdRol;
    const idUsuario = usuarioAutenticado.idUsuario || usuarioAutenticado.IdUsuario;
    const deptoUsuario = usuarioAutenticado.idDepartamento !== undefined
      ? usuarioAutenticado.idDepartamento
      : usuarioAutenticado.IdDepartamento;

    if (rol === 2) {
      if (Number(incidencia.idTrabajadorAsignado) !== Number(idUsuario)) {
        const error = new Error('Acceso denegado: Solo puedes actualizar incidencias asignadas a tu cuadrilla.');
        error.statusCode = 403;
        throw error;
      }
      if (![2, 3, 4].includes(nuevoEstado)) {
        const error = new Error('Los trabajadores de campo solo pueden actualizar a estados En Revisión (2), En Progreso (3) o Atendido (4).');
        error.statusCode = 400;
        throw error;
      }
    } else if (rol === 3) {
      if (Number(incidencia.idDepartamento) !== Number(deptoUsuario)) {
        const error = new Error('No tienes permisos para actualizar incidencias de otro departamento.');
        error.statusCode = 403;
        throw error;
      }
    } else if (rol !== 4) {
      const error = new Error('Acceso denegado: Rol no autorizado para actualizar el estado de incidencias.');
      error.statusCode = 403;
      throw error;
    }

    return await this.incidenciaRepository.actualizarEstado(idIncNum, nuevoEstado);
  }
}

module.exports = IncidenciaOperacionService;
