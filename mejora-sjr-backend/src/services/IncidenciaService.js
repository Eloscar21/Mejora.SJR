// src/services/IncidenciaService.js
'use strict';

/**
 * Coordenadas límite geográficas aproximadas para el Municipio de San Juan del Río, Qro.
 * Latitud: ~20.20 a ~20.60 N
 * Longitud: ~-100.20 a ~-99.80 W
 */
const SJR_BOUNDS = {
  LAT_MIN: 20.20,
  LAT_MAX: 20.60,
  LNG_MIN: -100.20,
  LNG_MAX: -99.80
};

class IncidenciaService {
  /**
   * @param {import('../repositories/IIncidenciaRepository')} incidenciaRepository
   * @param {import('../repositories/ICatalogoRepository')} catalogoRepository
   */
  constructor(incidenciaRepository, catalogoRepository) {
    if (!incidenciaRepository) {
      throw new Error('incidenciaRepository es requerido en IncidenciaService.');
    }
    this.incidenciaRepository = incidenciaRepository;
    this.catalogoRepository = catalogoRepository;
  }

  /**
   * Valida y crea una nueva incidencia ciudadana
   * @param {Object} datos
   * @param {string} datos.descripcion
   * @param {number} datos.latitud
   * @param {number} datos.longitud
   * @param {number} datos.idCategoria
   * @param {string} [datos.fotoUrl]
   * @param {Object} usuarioAutenticado - Payload extraído del JWT
   */
  async crearIncidencia({ descripcion, latitud, longitud, idCategoria, fotoUrl }, usuarioAutenticado) {
    if (!usuarioAutenticado || !usuarioAutenticado.idUsuario) {
      const error = new Error('No se pudo identificar al usuario autenticado.');
      error.statusCode = 401;
      throw error;
    }

    // Regla de Negocio: Sólo los ciudadanos (Rol 1) emiten reportes ciudadanos
    if (usuarioAutenticado.idRol !== 1) {
      const error = new Error('Acceso denegado: Únicamente los ciudadanos pueden crear reportes de incidencias.');
      error.statusCode = 403;
      throw error;
    }

    // Validar descripción
    if (!descripcion || typeof descripcion !== 'string' || descripcion.trim().length < 10) {
      const error = new Error('La descripción debe tener al menos 10 caracteres explicativos.');
      error.statusCode = 400;
      throw error;
    }

    // Validar categoría
    const catNum = Number(idCategoria);
    if (!catNum || isNaN(catNum) || catNum <= 0) {
      const error = new Error('Debe proporcionar un idCategoria válido.');
      error.statusCode = 400;
      throw error;
    }

    // Si catalogoRepository está disponible, verificar existencia de la categoría
    if (this.catalogoRepository && typeof this.catalogoRepository.obtenerCategorias === 'function') {
      const categorias = await this.catalogoRepository.obtenerCategorias();
      const existeCategoria = categorias.some(c => c.idCategoria === catNum);
      if (!existeCategoria) {
        const error = new Error(`La categoría con ID ${catNum} no existe en el catálogo.`);
        error.statusCode = 400;
        throw error;
      }
    }

    // Validar coordenadas geográficas
    const latNum = Number(latitud);
    const lngNum = Number(longitud);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      const error = new Error('Coordenadas geográficas inválidas.');
      error.statusCode = 400;
      throw error;
    }

    // Validar perímetro de San Juan del Río
    if (latNum < SJR_BOUNDS.LAT_MIN || latNum > SJR_BOUNDS.LAT_MAX ||
        lngNum < SJR_BOUNDS.LNG_MIN || lngNum > SJR_BOUNDS.LNG_MAX) {
      const error = new Error('La ubicación indicada se encuentra fuera del municipio de San Juan del Río.');
      error.statusCode = 400;
      throw error;
    }

    // Validar formato de URL si se incluye foto
    if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim().length > 0) {
      const urlRegex = /^(http|https):\/\/[^ "]+$/;
      if (!urlRegex.test(fotoUrl.trim())) {
        const error = new Error('La URL de la fotografía de evidencia no tiene un formato válido.');
        error.statusCode = 400;
        throw error;
      }
    }

    // Persistir en base de datos
    const nuevaIncidencia = await this.incidenciaRepository.crearIncidencia({
      descripcion: descripcion.trim(),
      latitud: latNum,
      longitud: lngNum,
      idUsuario: usuarioAutenticado.idUsuario,
      idCategoria: catNum,
      fotoUrl: fotoUrl ? fotoUrl.trim() : null
    });

    return nuevaIncidencia;
  }
}

module.exports = IncidenciaService;
