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
   * @param {import('../repositories/IUsuarioRepository')} [usuarioRepository]
   */
  constructor(incidenciaRepository, catalogoRepository, usuarioRepository) {
    if (!incidenciaRepository) {
      throw new Error('incidenciaRepository es requerido en IncidenciaService.');
    }
    this.incidenciaRepository = incidenciaRepository;
    this.catalogoRepository = catalogoRepository;
    this.usuarioRepository = usuarioRepository;
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

  /**
   * Listar incidencias con RBAC dinámico (US-025)
   * - Superadmin (Rol 4): lista todas las incidencias de todos los departamentos.
   * - Admin de Depto (Rol 3): filtra estrictamente por su propio departamento.
   * - Trabajador (Rol 2): filtra incidencias asignadas a él o de su depto.
   */
  async listarIncidencias(usuarioAutenticado, filtros = {}) {
    if (!usuarioAutenticado) {
      const error = new Error('No se pudo identificar al usuario autenticado.');
      error.statusCode = 401;
      throw error;
    }

    const rol = usuarioAutenticado.idRol || usuarioAutenticado.IdRol;
    const deptoToken = usuarioAutenticado.idDepartamento !== undefined 
      ? usuarioAutenticado.idDepartamento 
      : usuarioAutenticado.IdDepartamento;

    const queryFiltros = { ...filtros };

    if (rol === 3) {
      // Inyección estricta de aislamiento RBAC para Admin de Departamento
      queryFiltros.idDepartamento = deptoToken;
    } else if (rol === 2) {
      // Trabajador operativo: ve las asignadas a él o de su departamento
      queryFiltros.idDepartamento = deptoToken;
      if (filtros.soloAsignadasAMi) {
        queryFiltros.idTrabajadorAsignado = usuarioAutenticado.idUsuario;
      }
    } else if (rol !== 4) {
      const error = new Error('Acceso denegado: Rol no autorizado para consultar incidencias.');
      error.statusCode = 403;
      throw error;
    }

    return await this.incidenciaRepository.listarIncidencias(queryFiltros);
  }

  /**
   * Asignar trabajador de campo a una incidencia (US-025)
   * Valida que el trabajador pertenezca al mismo departamento de la incidencia
   */
  async asignarTrabajador(idIncidencia, idTrabajador, usuarioAutenticado) {
    const idIncNum = Number(idIncidencia);
    const idTrabNum = Number(idTrabajador);

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

    // RBAC: Si es Admin (Rol 3), debe ser de su propio departamento
    if (rol === 3 && incidencia.idDepartamento !== deptoUsuario) {
      const error = new Error('No tienes permisos para asignar incidencias de otro departamento.');
      error.statusCode = 403;
      throw error;
    }

    // Validar si el trabajador existe y es Rol 2
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

    // Asignar y actualizar a Estado 2 (En Revisión) o 3 (En Progreso)
    const incidenciaActualizada = await this.incidenciaRepository.asignarTrabajador(idIncNum, idTrabNum, 2);
    return incidenciaActualizada;
  }

  /**
   * Descartar incidencia como ficticia / falsa (Estado 5) (US-025)
   */
  async descartarIncidencia(idIncidencia, { motivoRechazo }, usuarioAutenticado) {
    const idIncNum = Number(idIncidencia);

    if (!idIncNum || isNaN(idIncNum)) {
      const error = new Error('ID de incidencia inválido.');
      error.statusCode = 400;
      throw error;
    }

    if (!motivoRechazo || typeof motivoRechazo !== 'string' || motivoRechazo.trim().length < 5) {
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

    // RBAC: Si es Admin (Rol 3), debe ser de su propio departamento
    if (rol === 3 && incidencia.idDepartamento !== deptoUsuario) {
      const error = new Error('No tienes permisos para descartar incidencias de otro departamento.');
      error.statusCode = 403;
      throw error;
    }

    const resultado = await this.incidenciaRepository.descartarIncidencia(idIncNum, motivoRechazo.trim());
    return resultado;
  }
}

module.exports = IncidenciaService;

