// src/services/CatalogoService.js
'use strict';

class CatalogoService {
  /**
   * @param {import('../repositories/ICatalogoRepository')} catalogoRepository
   */
  constructor(catalogoRepository) {
    if (!catalogoRepository) {
      throw new Error('catalogoRepository es requerido en CatalogoService.');
    }
    this.catalogoRepository = catalogoRepository;
  }

  async listarDepartamentos(usuarioAutenticado = null) {
    const departamentos = await this.catalogoRepository.obtenerDepartamentos();
    if (usuarioAutenticado && Number(usuarioAutenticado.idRol) === 3) {
      const deptoActor = Number(usuarioAutenticado.idDepartamento);
      return departamentos.filter((d) => Number(d.idDepartamento) === deptoActor);
    }
    return departamentos;
  }

  async listarCategorias(filtrosOId = null, usuarioAutenticado = null) {
    const rawDepto = typeof filtrosOId === 'object' && filtrosOId !== null
      ? filtrosOId.idDepartamento
      : filtrosOId;
    const soloActivasParam = typeof filtrosOId === 'object' && filtrosOId !== null
      ? filtrosOId.soloActivas
      : null;

    let deptoIdFiltrar = rawDepto;

    // Aislamiento Departamental Estricto (US-030): Admin de Depto (Rol 3) solo ve su propia dependencia
    if (usuarioAutenticado && Number(usuarioAutenticado.idRol) === 3) {
      const deptoActor = Number(usuarioAutenticado.idDepartamento);
      if (rawDepto && Number(rawDepto) !== deptoActor) {
        const error = new Error('Acceso denegado: No tienes autorización para consultar o gestionar catálogos de otra dependencia.');
        error.statusCode = 403;
        throw error;
      }
      deptoIdFiltrar = deptoActor;
    }

    // Regla de Negocio para el Ciudadano (US-037):
    // El ciudadano (Rol 1 o sin token) solo ve categorías activas (Activo = 1).
    // Los administradores (Rol 3 y 4) ven todas por defecto para gestionarlas, a menos que filtren soloActivas=true.
    const rol = usuarioAutenticado ? Number(usuarioAutenticado.idRol) : 1;
    const esAdmin = rol === 3 || rol === 4;
    const soloActivas = esAdmin
      ? (soloActivasParam === true || soloActivasParam === 'true')
      : true;

    if (deptoIdFiltrar !== null && deptoIdFiltrar !== undefined && deptoIdFiltrar !== '') {
      const deptoIdNum = Number(deptoIdFiltrar);
      if (isNaN(deptoIdNum) || deptoIdNum <= 0) {
        const error = new Error('El parámetro idDepartamento debe ser un número entero válido.');
        error.statusCode = 400;
        throw error;
      }
      return await this.catalogoRepository.obtenerCategorias(deptoIdNum, soloActivas);
    }

    return await this.catalogoRepository.obtenerCategorias(null, soloActivas);
  }

  /**
   * Crea una nueva categoría en el catálogo con validación RBAC por departamento (US-035).
   * - Rol 3 (Admin Depto): Solo puede crear categorías para su propio departamento (idDepartamento del JWT).
   * - Rol 4 (Superadmin): Puede crear categorías para cualquier departamento válido.
   */
  async crearCategoria(datosCategoria = {}, usuarioAutenticado = null) {
    const { nombre, idDepartamento } = datosCategoria || {};
    if (!usuarioAutenticado || !usuarioAutenticado.idRol) {
      const error = new Error('Se requiere autenticación para crear categorías.');
      error.statusCode = 401;
      throw error;
    }

    const rolActor = Number(usuarioAutenticado.idRol);
    if (rolActor !== 3 && rolActor !== 4) {
      const error = new Error('Acceso denegado: Solo Administradores y Superadmin pueden crear categorías.');
      error.statusCode = 403;
      throw error;
    }

    const nombreLimpio = typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '';
    if (nombreLimpio.length < 3 || nombreLimpio.length > 100) {
      const error = new Error('El nombre de la categoría es obligatorio y debe tener entre 3 y 100 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    let deptoIdNum = idDepartamento !== undefined && idDepartamento !== null && idDepartamento !== ''
      ? Number(idDepartamento)
      : null;

    if (rolActor === 3) {
      const deptoActor = Number(usuarioAutenticado.idDepartamento);
      if (!deptoActor || isNaN(deptoActor) || deptoActor <= 0) {
        const error = new Error('Tu sesión no tiene un departamento válido asignado.');
        error.statusCode = 403;
        throw error;
      }
      if (deptoIdNum !== null && deptoIdNum !== deptoActor) {
        const error = new Error('Acceso denegado: No tienes autorización para crear categorías en otra dependencia.');
        error.statusCode = 403;
        throw error;
      }
      deptoIdNum = deptoActor;
    }

    if (deptoIdNum === null || isNaN(deptoIdNum) || !Number.isInteger(deptoIdNum) || deptoIdNum <= 0) {
      const error = new Error('Debe proporcionar un idDepartamento entero válido.');
      error.statusCode = 400;
      throw error;
    }

    const departamentos = await this.catalogoRepository.obtenerDepartamentos();
    const deptoExiste = departamentos.some((d) => Number(d.idDepartamento) === deptoIdNum);
    if (!deptoExiste) {
      const error = new Error(`El departamento con ID ${deptoIdNum} no existe en el catálogo.`);
      error.statusCode = 400;
      throw error;
    }

    const categoriasExistentes = await this.catalogoRepository.obtenerCategorias(deptoIdNum);
    const duplicada = categoriasExistentes.some(
      (c) => String(c.nombre).trim().toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (duplicada) {
      const error = new Error('Ya existe una categoría con ese nombre en la dependencia seleccionada.');
      error.statusCode = 409;
      throw error;
    }

    return await this.catalogoRepository.crearCategoria({
      nombre: nombreLimpio,
      idDepartamento: deptoIdNum
    });
  }

  /**
   * Actualiza una categoría existente validando aislamiento RBAC departamental (US-035).
   */
  async actualizarCategoria(idCategoria, datosCategoria = {}, usuarioAutenticado = null) {
    const { nombre, idDepartamento } = datosCategoria || {};
    if (!usuarioAutenticado || !usuarioAutenticado.idRol) {
      const error = new Error('Se requiere autenticación para actualizar categorías.');
      error.statusCode = 401;
      throw error;
    }

    const rolActor = Number(usuarioAutenticado.idRol);
    if (rolActor !== 3 && rolActor !== 4) {
      const error = new Error('Acceso denegado: Solo Administradores y Superadmin pueden modificar categorías.');
      error.statusCode = 403;
      throw error;
    }

    const idCatNum = Number(idCategoria);
    if (!idCatNum || isNaN(idCatNum) || idCatNum <= 0) {
      const error = new Error('ID de categoría inválido.');
      error.statusCode = 400;
      throw error;
    }

    const nombreLimpio = typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '';
    if (nombreLimpio.length < 3 || nombreLimpio.length > 100) {
      const error = new Error('El nombre de la categoría debe tener entre 3 y 100 caracteres.');
      error.statusCode = 400;
      throw error;
    }

    const todas = await this.catalogoRepository.obtenerCategorias();
    const actual = todas.find((c) => Number(c.idCategoria) === idCatNum);
    if (!actual) {
      const error = new Error('La categoría indicada no existe.');
      error.statusCode = 404;
      throw error;
    }

    let deptoIdNum = idDepartamento !== undefined && idDepartamento !== null
      ? Number(idDepartamento)
      : Number(actual.idDepartamento);

    if (rolActor === 3) {
      const deptoActor = Number(usuarioAutenticado.idDepartamento);
      if (Number(actual.idDepartamento) !== deptoActor || deptoIdNum !== deptoActor) {
        const error = new Error('Acceso denegado: No tienes autorización para modificar categorías de otra dependencia.');
        error.statusCode = 403;
        throw error;
      }
      deptoIdNum = deptoActor;
    }

    return await this.catalogoRepository.actualizarCategoria(idCatNum, {
      nombre: nombreLimpio,
      idDepartamento: deptoIdNum
    });
  }

  /**
   * Cambia el estado (activo/inactivo) de una categoría con validación RBAC departamental (US-037).
   * - Rol 3 (Admin Depto): Solo puede activar/desactivar categorías de su propio departamento.
   * - Rol 4 (Superadmin): Puede activar/desactivar categorías de cualquier departamento.
   */
  async cambiarEstadoCategoria(idCategoria, datosEstado = {}, usuarioAutenticado = null) {
    if (!usuarioAutenticado || !usuarioAutenticado.idRol) {
      const error = new Error('Se requiere autenticación para cambiar el estado de la categoría.');
      error.statusCode = 401;
      throw error;
    }

    const rolActor = Number(usuarioAutenticado.idRol);
    if (rolActor !== 3 && rolActor !== 4) {
      const error = new Error('Acceso denegado: Solo Administradores y Superadmin pueden cambiar el estado de categorías.');
      error.statusCode = 403;
      throw error;
    }

    const idCatNum = Number(idCategoria);
    if (!idCatNum || isNaN(idCatNum) || idCatNum <= 0) {
      const error = new Error('ID de categoría inválido.');
      error.statusCode = 400;
      throw error;
    }

    const todas = await this.catalogoRepository.obtenerCategorias(null, false);
    const actual = todas.find((c) => Number(c.idCategoria) === idCatNum);
    if (!actual) {
      const error = new Error('La categoría indicada no existe.');
      error.statusCode = 404;
      throw error;
    }

    if (rolActor === 3) {
      const deptoActor = Number(usuarioAutenticado.idDepartamento);
      if (Number(actual.idDepartamento) !== deptoActor) {
        const error = new Error('Acceso denegado: No tienes autorización para modificar categorías de otra dependencia.');
        error.statusCode = 403;
        throw error;
      }
    }

    const activoRaw = typeof datosEstado === 'object' && datosEstado !== null
      ? datosEstado.activo
      : datosEstado;
    const nuevoActivo = activoRaw === true || activoRaw === 'true' || activoRaw === 1 || activoRaw === '1';

    return await this.catalogoRepository.cambiarEstadoCategoria(idCatNum, nuevoActivo);
  }
}

module.exports = CatalogoService;
