/**
 * incidencia.types.ts
 * Modelos y contratos de datos para la Bandeja de Incidencias Municipales (US-026 / US-025).
 */

export type EstadoIncidenciaId = 1 | 2 | 3 | 4 | 5;

export interface EstadoIncidenciaMeta {
  idEstado: EstadoIncidenciaId;
  nombre: string;
  descripcion: string;
}

export const ESTADOS_INCIDENCIA: Record<EstadoIncidenciaId, EstadoIncidenciaMeta> = {
  1: {
    idEstado: 1,
    nombre: 'Recibido',
    descripcion: 'Reporte ciudadano recién ingresado pendiente de asignación.',
  },
  2: {
    idEstado: 2,
    nombre: 'En Revisión',
    descripcion: 'Asignado a cuadrilla operativa para verificación en sitio.',
  },
  3: {
    idEstado: 3,
    nombre: 'En Progreso',
    descripcion: 'Trabajador de campo ejecutando labores de reparación.',
  },
  4: {
    idEstado: 4,
    nombre: 'Resuelto',
    descripcion: 'Incidencia atendida satisfactoriamente con evidencia final.',
  },
  5: {
    idEstado: 5,
    nombre: 'Rechazado',
    descripcion: 'Reporte descartado como falso, improcedente o duplicado.',
  },
};

export interface Incidencia {
  idIncidencia: number;
  descripcion: string;
  latitud: number;
  longitud: number;
  fechaCreacion: string;
  fechaActualizacion?: string;
  idEstado: number;
  estadoNombre: string;
  idCategoria: number;
  categoriaNombre: string;
  idDepartamento: number;
  departamentoNombre: string;
  idCiudadano?: number;
  ciudadanoNombre?: string;
  idTrabajadorAsignado: number | null;
  trabajadorNombre?: string | null;
  fotoInicialUrl?: string | null;
  fotoResolucionUrl?: string | null;
  motivoRechazo?: string | null;
}

export interface FiltrosIncidencias {
  idDepartamento?: number | null;
  idEstado?: number | null;
  idTrabajadorAsignado?: number | null;
}

export interface MetricasIncidencias {
  total: number;
  recibidos: number;
  enProceso: number;
  resueltos: number;
  descartados: number;
}

