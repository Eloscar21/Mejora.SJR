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
    const evidenciasRelacionadas = this.evidencias.filter(e => e.idIncidencia === inc.idIncidencia);
    return {
      ...inc,
      evidencias: [...evidenciasRelacionadas]
    };
  }
}

module.exports = MockIncidenciaRepository;
