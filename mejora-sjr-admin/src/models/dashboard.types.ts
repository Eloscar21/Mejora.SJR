/**
 * dashboard.types.ts
 * Modelos de dominio y contratos de datos para el Dashboard Ejecutivo Municipal (US-014).
 *
 * Principios aplicados:
 * - ISP (Interface Segregation Principle): Contratos específicos para KPIs, desglose departamental y actividad reciente.
 * - Alineación directa con el modelo relacional de Mejora SJR (Estados, Categorías y Departamentos).
 */

export type EstadoKpiCategoria = 'NUEVO' | 'EN_PROCESO' | 'RESUELTO';

export type FiltroEstadoDashboard = 'TODOS' | EstadoKpiCategoria;

export type FiltroJurisdiccionDepto = 'TODOS' | 1 | 2;

export interface DashboardKpiMetrics {
  nuevosReportes: number;
  enProceso: number;
  resueltos: number;
  totalReportes: number;
  tasaResolucion: number;
  tiempoPromedioRespuestaHoras: number;
}

export interface CategoriaMetricItem {
  idCategoria: number;
  nombre: string;
  idDepartamento: number;
  departamento: string;
  nuevos: number;
  enProceso: number;
  resueltos: number;
  total: number;
}

export interface ReporteEjecutivoReciente {
  idIncidencia: number;
  folio: string;
  descripcion: string;
  categoria: string;
  idDepartamento: number;
  departamento: string;
  coloniaUbicacion: string;
  estadoKpi: EstadoKpiCategoria;
  estadoOficial: 'Recibido' | 'En Revisión' | 'En Progreso' | 'Atendido';
  prioridad: 'Alta' | 'Media' | 'Normal';
  fechaCreacion: string;
  cuadrillaAsignada: string | null;
}

export interface DashboardResumenEjecutivo {
  kpis: DashboardKpiMetrics;
  porCategoria: CategoriaMetricItem[];
  reportesRecientes: ReporteEjecutivoReciente[];
  ultimaActualizacionIso: string;
}

