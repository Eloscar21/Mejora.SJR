// src/services/IncidenciaCreacionService.js
'use strict';

const IIncidenciaCreacionService = require('./contracts/IIncidenciaCreacionService');

const SJR_BOUNDS = {
  LAT_MIN: 20.20,
  LAT_MAX: 20.60,
  LNG_MIN: -100.20,
  LNG_MAX: -99.80
};

class IncidenciaCreacionService extends IIncidenciaCreacionService {
  /**
   * @param {import('../repositories/IIncidenciaRepository')} incidenciaRepository
   * @param {import('../repositories/ICatalogoRepository')} [catalogoRepository]
   */
  constructor(incidenciaRepository, catalogoRepository) {
    super();
    if (!incidenciaRepository) {
      throw new Error('incidenciaRepository es requerido en IncidenciaCreacionService.');
    }
    this.incidenciaRepository = incidenciaRepository;
    this.catalogoRepository = catalogoRepository;
  }

  async crearIncidencia({ descripcion, latitud, longitud, idCategoria, fotoUrl }, usuarioAutenticado) {
    if (!usuarioAutenticado || !usuarioAutenticado.idUsuario) {
      const error = new Error('No se pudo identificar al usuario autenticado.');
      error.statusCode = 401;
      throw error;
    }

    if (usuarioAutenticado.idRol !== 1) {
      const error = new Error('Acceso denegado: Únicamente los ciudadanos pueden crear reportes de incidencias.');
      error.statusCode = 403;
      throw error;
    }

    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 10) {
      const error = new Error('La descripción debe tener al menos 10 caracteres explicativos.');
      error.statusCode = 400;
      throw error;
    }

    const catNum = Number(idCategoria);
    if (!catNum || isNaN(catNum) || catNum <= 0) {
      const error = new Error('Debe proporcionar un idCategoria válido.');
      error.statusCode = 400;
      throw error;
    }

    if (this.catalogoRepository && typeof this.catalogoRepository.obtenerCategorias === 'function') {
      const categorias = await this.catalogoRepository.obtenerCategorias();
      const existeCategoria = categorias.some(c => c.idCategoria === catNum && c.activo !== false);
      if (!existeCategoria) {
        const error = new Error(`La categoría con ID ${catNum} no existe en el catálogo.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const latNum = Number(latitud);
    const lngNum = Number(longitud);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      const error = new Error('Coordenadas geográficas inválidas.');
      error.statusCode = 400;
      throw error;
    }

    if (latNum < SJR_BOUNDS.LAT_MIN || latNum > SJR_BOUNDS.LAT_MAX ||
        lngNum < SJR_BOUNDS.LNG_MIN || lngNum > SJR_BOUNDS.LNG_MAX) {
      const error = new Error('La ubicación indicada se encuentra fuera del municipio de San Juan del Río.');
      error.statusCode = 400;
      throw error;
    }

    if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim().length > 0) {
      const urlRegex = /^(http|https):\/\/[^ "]+$/;
      if (!urlRegex.test(fotoUrl.trim())) {
        const error = new Error('La URL de la fotografía de evidencia no tiene un formato válido.');
        error.statusCode = 400;
        throw error;
      }
    }

    return await this.incidenciaRepository.crearIncidencia({
      descripcion: descripcion.trim(),
      latitud: latNum,
      longitud: lngNum,
      idUsuario: usuarioAutenticado.idUsuario,
      idCategoria: catNum,
      fotoUrl: fotoUrl ? fotoUrl.trim() : null
    });
  }
}

module.exports = IncidenciaCreacionService;
