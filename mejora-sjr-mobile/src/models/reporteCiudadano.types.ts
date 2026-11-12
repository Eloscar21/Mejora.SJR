import type { NuevaIncidenciaDTO } from './incidencia.types';

/** Datos comunes de la consulta ciudadana; el adaptador normaliza idUsuario/idCiudadano. */
export interface ReporteCiudadano {
  idIncidencia: number;
  idUsuario: number;
  descripcion: string;
  idCategoria: number;
  categoriaNombre?: string;
  latitud: number;
  longitud: number;
  idEstado: number;
  estadoNombre?: string;
  fechaCreacion: string;
  fotoInicialUrl: string | null;
}

/** Coincidencia para revisión humana; no reemplaza una clave de idempotencia del servidor. */
export function coincideConBorrador(reporte: ReporteCiudadano, borrador: NuevaIncidenciaDTO): boolean {
  return reporte.descripcion.trim() === borrador.descripcion.trim() &&
    reporte.idCategoria === borrador.idCategoria && reporte.latitud === borrador.latitud &&
    reporte.longitud === borrador.longitud && (!borrador.fotoUrl || reporte.fotoInicialUrl === borrador.fotoUrl);
}
