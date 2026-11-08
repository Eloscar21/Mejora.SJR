import type { Incidencia } from '../../models/incidencia.types';

/** Consulta de asignaciones; no implica permisos ni operaciones de actualización. */
export interface IBandejaConsultaService {
  listarAsignadas(idTrabajador: number): Promise<Incidencia[]>;
}
