/**
 * catalogo.types.ts
 * Modelos de datos para la consulta y administración de Catálogos Municipales (US-002 / US-027).
 */

/** Departamento / Secretaría Municipal oficial (US-002 / US-027). */
export interface Departamento {
  idDepartamento: number;
  nombre: string;
  siglas?: string;
  descripcion?: string;
  titular?: string;
  activo?: boolean;
}

/** Categoría oficial de reportes ciudadanos vinculada a una dependencia (US-002 / US-027). */
export interface CategoriaReporte {
  idCategoria: number;
  nombre: string;
  idDepartamento: number;
  departamentoNombre: string;
  descripcion?: string;
  prioridad?: 'Alta' | 'Media' | 'Baja';
  slaHoras?: number;
  activo?: boolean;
}

export interface GuardarDepartamentoPayload {
  nombre: string;
  siglas?: string;
  descripcion?: string;
  titular?: string;
  activo?: boolean;
}

export interface GuardarCategoriaPayload {
  nombre: string;
  idDepartamento: number;
  descripcion?: string;
  prioridad?: 'Alta' | 'Media' | 'Baja';
  slaHoras?: number;
  activo?: boolean;
}

export interface MetricasCatalogos {
  totalDepartamentos: number;
  totalCategorias: number;
  categoriasActivas: number;
  categoriasJapam: number;
  categoriasServiciosPublicos: number;
}
