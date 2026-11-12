import type { NuevaIncidenciaDTO, ReporteCreado } from '../../models/incidencia.types';

/** Creación de reportes; no obliga al formulario a depender de consultas o asignaciones. */
export interface IReporteSubmissionService {
  crearReporte(datos: NuevaIncidenciaDTO): Promise<ReporteCreado>;
}
