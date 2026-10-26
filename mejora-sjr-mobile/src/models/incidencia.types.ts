/**
 * incidencia.types.ts
 * Modelos de datos para el levantamiento de reportes ciudadanos y bandeja de órdenes de trabajadores.
 */

export interface Incidencia {
  idIncidencia: number;
  descripcion: string;
  latitud: number;
  longitud: number;
  idCategoria: number;
  categoriaNombre?: string;
  idDepartamento: number;
  departamentoNombre?: string;
  idEstado: number;
  estadoNombre: string;
  idUsuario: number;
  ciudadanoNombre: string;
  idTrabajadorAsignado?: number | null;
  trabajadorNombre?: string | null;
  fechaCreacion: string;
  fechaActualizacion?: string;
  fotoInicialUrl?: string;
  direccionReferencia?: string;
}

export interface NuevaIncidenciaDTO {
  descripcion: string;
  idDepartamento: number;
  idCategoria: number;
  latitud: number;
  longitud: number;
  direccionReferencia: string;
  fotoUri?: string;
}

export const ESTADOS_INCIDENCIA = {
  1: { nombre: 'Recibido', color: '#64748B', bg: '#F1F5F9' },
  2: { nombre: 'En Revisión', color: '#D97706', bg: '#FEF3C7' },
  3: { nombre: 'En Progreso', color: '#2563EB', bg: '#DBEAFE' },
  4: { nombre: 'Atendido', color: '#16A34A', bg: '#DCFCE7' },
  5: { nombre: 'Rechazado', color: '#DC2626', bg: '#FEE2E2' },
} as const;
