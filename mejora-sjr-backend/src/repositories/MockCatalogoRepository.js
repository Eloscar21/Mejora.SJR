// src/repositories/MockCatalogoRepository.js
'use strict';

const ICatalogoRepository = require('./ICatalogoRepository');

class MockCatalogoRepository extends ICatalogoRepository {
  constructor() {
    super();
    this.departamentos = [
      { idDepartamento: 1, nombre: 'JAPAM' },
      { idDepartamento: 2, nombre: 'Servicios Públicos' }
    ];

    this.categorias = [
      { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1, activo: true },
      { idCategoria: 2, nombre: 'Alcantarillado', idDepartamento: 1, activo: true },
      { idCategoria: 3, nombre: 'Alumbrado', idDepartamento: 2, activo: true },
      { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2, activo: true }
    ];
  }

  async obtenerDepartamentos() {
    return this.departamentos.map(d => ({ ...d }));
  }

  async obtenerCategorias(idDepartamento = null, soloActivas = false) {
    let lista = this.categorias;
    if (idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== '') {
      lista = lista.filter(c => c.idDepartamento === Number(idDepartamento));
    }
    if (soloActivas) {
      lista = lista.filter(c => c.activo !== false);
    }

    return lista.map(c => {
      const depto = this.departamentos.find(d => d.idDepartamento === c.idDepartamento);
      return {
        idCategoria: c.idCategoria,
        nombre: c.nombre,
        idDepartamento: c.idDepartamento,
        departamentoNombre: depto ? depto.nombre : 'Desconocido',
        activo: c.activo !== false
      };
    });
  }

  async crearCategoria({ nombre, idDepartamento, activo = true }) {
    const deptoNum = Number(idDepartamento);
    const depto = this.departamentos.find(d => d.idDepartamento === deptoNum);
    const maxId = this.categorias.reduce((max, c) => Math.max(max, Number(c.idCategoria)), 0);
    const nueva = {
      idCategoria: maxId + 1,
      nombre: nombre.trim(),
      idDepartamento: deptoNum,
      activo: activo !== false
    };
    this.categorias.push(nueva);

    return {
      idCategoria: nueva.idCategoria,
      nombre: nueva.nombre,
      idDepartamento: nueva.idDepartamento,
      departamentoNombre: depto ? depto.nombre : 'Desconocido',
      activo: nueva.activo
    };
  }

  async actualizarCategoria(idCategoria, { nombre, idDepartamento, activo }) {
    const idx = this.categorias.findIndex(c => c.idCategoria === Number(idCategoria));
    if (idx === -1) return null;

    if (nombre !== undefined && nombre !== null) {
      this.categorias[idx].nombre = nombre.trim();
    }
    if (idDepartamento !== undefined && idDepartamento !== null) {
      this.categorias[idx].idDepartamento = Number(idDepartamento);
    }
    if (activo !== undefined && activo !== null) {
      this.categorias[idx].activo = Boolean(activo);
    }

    const depto = this.departamentos.find(d => d.idDepartamento === this.categorias[idx].idDepartamento);
    return {
      idCategoria: this.categorias[idx].idCategoria,
      nombre: this.categorias[idx].nombre,
      idDepartamento: this.categorias[idx].idDepartamento,
      departamentoNombre: depto ? depto.nombre : 'Desconocido',
      activo: this.categorias[idx].activo !== false
    };
  }

  async cambiarEstadoCategoria(idCategoria, activo) {
    const idx = this.categorias.findIndex(c => c.idCategoria === Number(idCategoria));
    if (idx === -1) return null;

    this.categorias[idx].activo = Boolean(activo);
    const depto = this.departamentos.find(d => d.idDepartamento === this.categorias[idx].idDepartamento);
    return {
      idCategoria: this.categorias[idx].idCategoria,
      nombre: this.categorias[idx].nombre,
      idDepartamento: this.categorias[idx].idDepartamento,
      departamentoNombre: depto ? depto.nombre : 'Desconocido',
      activo: this.categorias[idx].activo
    };
  }
}

module.exports = MockCatalogoRepository;
