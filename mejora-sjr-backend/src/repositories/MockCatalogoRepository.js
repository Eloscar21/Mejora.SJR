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
      { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1 },
      { idCategoria: 2, nombre: 'Alcantarillado', idDepartamento: 1 },
      { idCategoria: 3, nombre: 'Alumbrado', idDepartamento: 2 },
      { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2 }
    ];
  }

  async obtenerDepartamentos() {
    return this.departamentos.map(d => ({ ...d }));
  }

  async obtenerCategorias(idDepartamento = null) {
    let lista = this.categorias;
    if (idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== '') {
      lista = lista.filter(c => c.idDepartamento === Number(idDepartamento));
    }

    // Resolución de llave foránea hacia Departamento (LSP e Inmutabilidad)
    return lista.map(c => {
      const depto = this.departamentos.find(d => d.idDepartamento === c.idDepartamento);
      return {
        idCategoria: c.idCategoria,
        nombre: c.nombre,
        idDepartamento: c.idDepartamento,
        departamentoNombre: depto ? depto.nombre : 'Desconocido'
      };
    });
  }
}

module.exports = MockCatalogoRepository;
