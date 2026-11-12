/**
 * IIncidenciaService.ts
 * Contrato de servicio para la gestión administrativa de incidencias ciudadanas (US-026 / US-025).
 * Cumple con el Principio de Inversión de Dependencias (DIP) y Segregación de Interfaces (ISP).
 */

import type { FiltrosIncidencias, Incidencia } from '../../models/incidencia.types';

export interface IIncidenciaService {
  /**
   * Obtiene el listado de incidencias respetando el alcance RBAC y filtros opcionales.
   */
  listarIncidencias(filtros?: FiltrosIncidencias): Promise<Incidencia[]>;

  /**
   * Asigna una incidencia a un trabajador operativo (Rol 2) del mismo departamento.
   */
  asignarTrabajador(idIncidencia: number, idTrabajador: number): Promise<Incidencia>;

  /**
   * Descarta una incidencia como falsa o improcedente (Estado 5) registrando motivo de auditoría.
   */
  descartarIncidencia(idIncidencia: number, motivoRechazo: string): Promise<Incidencia>;
}

