// src/repositories/MockIncidenciaRepository.js
'use strict';

const IIncidenciaRepository = require('./IIncidenciaRepository');

/**
 * Repositorio en memoria para Pruebas Unitarias e integración ágil (Mock - US-023)
 */
class MockIncidenciaRepository extends IIncidenciaRepository {
  constructor(semillas = []) {
    super();
    this.incidencias = [...semillas];
    this.evidencias = [];
    this.nextIncidenciaId = this.incidencias.length + 1;
    this.nextEvidenciaId = 1;
  }

  async crearIncidencia({ descripcion, latitud, longitud, idUsuario, idCategoria, fotoUrl }) {
    const nuevaIncidencia = {
      idIncidencia: this.nextIncidenciaId++,
      descripcion: descripcion.trim(),
      latitud: Number(latitud),
      longitud: Number(longitud),
      idUsuario: Number(idUsuario),
      idCategoria: Number(idCategoria),
      idEstado: 1, // 1 = Recibido
      idTrabajadorAsignado: null,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      evidencias: []
    };

    if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim().length > 0) {
      const nuevaEvidencia = {
        idEvidencia: this.nextEvidenciaId++,
        idIncidencia: nuevaIncidencia.idIncidencia,
        idUsuario: Number(idUsuario),
        tipoEvidencia: 'INICIAL',
        fotoUrl: fotoUrl.trim(),
        fechaSubida: new Date()
      };
      this.evidencias.push(nuevaEvidencia);
      nuevaIncidencia.evidencias.push(nuevaEvidencia);
    }

    this.incidencias.push(nuevaIncidencia);
    return { ...nuevaIncidencia };
  }

  async buscarPorId(idIncidencia) {
    const inc = this.incidencias.find(i => i.idIncidencia === Number(idIncidencia));
    if (!inc) return null;
    const deptoCalculado = (inc.idCategoria === 1 || inc.idCategoria === 2) ? 1 : 2;
    const evidenciasRelacionadas = this.evidencias.filter(e => e.idIncidencia === inc.idIncidencia);
    return {
      ...inc,
      idDepartamento: deptoCalculado,
      departamentoNombre: deptoCalculado === 1 ? 'JAPAM' : 'Servicios Públicos',
      evidencias: [...evidenciasRelacionadas]
    };
  }

  async listarIncidencias({ idUsuario, idDepartamento, idEstado, idTrabajadorAsignado } = {}) {
    return this.incidencias
      .filter(i => {
        // En mock, asociamos categorías 1 y 2 a Depto 1 (JAPAM), y 3 y 4 a Depto 2 (Servicios Públicos)
        const deptoCalculado = (i.idCategoria === 1 || i.idCategoria === 2) ? 1 : 2;
        const cumpleDepto = idDepartamento !== undefined && idDepartamento !== null 
          ? deptoCalculado === Number(idDepartamento) 
          : true;
        const cumpleEstado = idEstado !== undefined && idEstado !== null 
          ? i.idEstado === Number(idEstado) 
          : true;
        const cumpleTrabajador = idTrabajadorAsignado !== undefined && idTrabajadorAsignado !== null 
          ? i.idTrabajadorAsignado === Number(idTrabajadorAsignado) 
          : true;
        const cumpleCiudadano = idUsuario !== undefined && idUsuario !== null
          ? i.idUsuario === Number(idUsuario)
          : true;

        return cumpleDepto && cumpleEstado && cumpleTrabajador && cumpleCiudadano;
      })
      .map(i => {
        const evs = this.evidencias.filter(e => e.idIncidencia === i.idIncidencia);
        const fotoInicial = evs.find(e => e.tipoEvidencia === 'INICIAL');
        const fotoResolucion = evs.find(e => e.tipoEvidencia === 'RESOLUCION');
        const deptoCalculado = (i.idCategoria === 1 || i.idCategoria === 2) ? 1 : 2;

        return {
          ...i,
          idDepartamento: deptoCalculado,
          departamentoNombre: deptoCalculado === 1 ? 'JAPAM' : 'Servicios Públicos',
          categoriaNombre: i.idCategoria === 1 ? 'Fugas de agua' : (i.idCategoria === 2 ? 'Alcantarillado' : 'Bacheo'),
          estadoNombre: i.idEstado === 1 ? 'Recibido' : (i.idEstado === 2 ? 'En Revisión' : (i.idEstado === 5 ? 'Rechazado' : 'En Progreso')),
          fotoInicialUrl: fotoInicial ? fotoInicial.fotoUrl : null,
          fotoResolucionUrl: fotoResolucion ? fotoResolucion.fotoUrl : null
        };
      });
  }

  async asignarTrabajador(idIncidencia, idTrabajador, nuevoEstado = 2) {
    const inc = this.incidencias.find(i => i.idIncidencia === Number(idIncidencia));
    if (!inc) return null;
    inc.idTrabajadorAsignado = Number(idTrabajador);
    inc.idEstado = Number(nuevoEstado);
    inc.fechaActualizacion = new Date();
    return { ...inc };
  }

  async descartarIncidencia(idIncidencia, motivoRechazo) {
    const inc = this.incidencias.find(i => i.idIncidencia === Number(idIncidencia));
    if (!inc) return null;
    inc.idEstado = 5; // Rechazado / Ficticio
    inc.motivoRechazo = motivoRechazo.trim();
    inc.fechaActualizacion = new Date();
    return { ...inc };
  }
}

module.exports = MockIncidenciaRepository;

