/**
 * IDashboardService.ts
 * Contrato SOLID para la consulta de métricas ejecutivas e indicadores KPI municipales (US-014).
 *
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Desacopla useDashboardViewModel de la fuente concreta (API REST o Mock).
 * - LSP (Liskov Substitution Principle): Permite intercambiar DashboardApiService y MockDashboardService de forma transparente.
 */

import { DashboardResumenEjecutivo } from '../../models/dashboard.types';

export interface IDashboardService {
  /**
   * Obtiene las métricas KPI ("Nuevos Reportes", "En Proceso", "Resueltos"),
   * el desglose por categoría y la actividad reciente del municipio o de una dependencia específica.
   *
   * @param idDepartamento Si se especifica (1 = JAPAM, 2 = Servicios Públicos), acota los indicadores a esa dependencia.
   */
  obtenerResumenEjecutivo(idDepartamento?: number | null): Promise<DashboardResumenEjecutivo>;
}

