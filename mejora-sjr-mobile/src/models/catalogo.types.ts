/**
 * catalogo.types.ts
 * Modelos de datos para el módulo de Catálogos Oficiales de San Juan del Río (US-002 / US-004).
 * 
 * Principios aplicados:
 * - ISP (Interface Segregation Principle): Modelos mínimos necesarios para poblar selectores y Pickers.
 */

export interface Departamento {
  idDepartamento: number;
  nombre: string;
}

export interface Categoria {
  idCategoria: number;
  nombre: string;
  idDepartamento: number;
  departamentoNombre?: string;
}

export interface CatalogoResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
}

export interface PickerItem<T = number | string> {
  label: string;
  value: T;
  extraInfo?: string;
}
