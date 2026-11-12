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

/** Payload de POST /api/incidencias. Usuario y departamento se resuelven en el backend. */
export interface NuevaIncidenciaDTO {
  descripcion: string;
  idCategoria: number;
  latitud: number;
  longitud: number;
  fotoUrl?: string;
}

/** Datos comunes de la evidencia inicial que devuelven los repositorios SQL y mock. */
export interface EvidenciaInicialReporte {
  idEvidencia: number;
  idIncidencia: number;
  tipoEvidencia: 'INICIAL';
  fotoUrl: string;
  fechaSubida: string;
}

/** Confirmación de creación de US-023; no exige los nombres enriquecidos del listado. */
export interface ReporteCreado {
  idIncidencia: number;
  descripcion: string;
  latitud: number;
  longitud: number;
  idUsuario: number;
  idCategoria: number;
  idEstado: 1;
  fechaCreacion: string;
  evidencias: EvidenciaInicialReporte[];
}

export const ESTADOS_INCIDENCIA = {
  1: { nombre: 'Recibido', color: '#64748B', bg: '#F1F5F9' },
  2: { nombre: 'En Revisión', color: '#D97706', bg: '#FEF3C7' },
  3: { nombre: 'En Progreso', color: '#2563EB', bg: '#DBEAFE' },
  4: { nombre: 'Atendido', color: '#16A34A', bg: '#DCFCE7' },
  5: { nombre: 'Rechazado', color: '#DC2626', bg: '#FEE2E2' },
} as const;
