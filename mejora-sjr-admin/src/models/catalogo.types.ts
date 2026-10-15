/**
 * catalogo.types.ts
 * Entidades y tipos de dominio para los catálogos del municipio de San Juan del Río.
 * Espejo de las tablas de la base de datos (schema.sql).
 */

export interface Rol {
  idRol: number;
  nombre: string;
}

export interface Departamento {
  idDepartamento: number;
  nombre: string;
}

export interface Estado {
  idEstado: number;
  nombre: string;
}

export interface Categoria {
  idCategoria: number;
  nombre: string;
  idDepartamento: number;
}
