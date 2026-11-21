/**
 * DashboardApiService.ts
 * Servicio de indicadores ejecutivos reales para el Panel Administrativo de Mejora SJR (US-014 / US-025 / US-030).
 *
 * Principios aplicados:
 * - DIP / LSP: Implementa IDashboardService consumiendo directamente la base de datos a través de /api/incidencias.
 * - Cero Datos Ficticios: Elimina todo mock en entornos conectados; computa KPIs, desglose por categoría
 *   y bandeja de folios recientes a partir de las incidencias reales persistidas en Azure SQL.
 * - Aislamiento Departamental: Respeta la jurisdicción de la sesión (JAPAM = Depto 1, Servicios Públicos = Depto 2)
 *   o supervisión municipal completa para Superadmin (Rol 4).
 */

import { IDashboardService } from '../contracts/IDashboardService';
import { IAuthService } from '../contracts/IAuthService';
import {
  CategoriaMetricItem,
  DashboardKpiMetrics,
  DashboardResumenEjecutivo,
  EstadoKpiCategoria,
  ReporteEjecutivoReciente,
} from '../../models/dashboard.types';
import { MockDashboardService } from '../mocks/MockDashboardService';
import { AuthApiService } from './AuthApiService';

interface IncidenciaBackendRaw {
  idIncidencia?: number;
  IdIncidencia?: number;
  descripcion?: string;
  Descripcion?: string;
  latitud?: number;
  Latitud?: number;
  longitud?: number;
  Longitud?: number;
  idEstado?: number;
  IdEstado?: number;
  estadoNombre?: string;
  Estado?: string;
  idCategoria?: number;
  IdCategoria?: number;
  categoriaNombre?: string;
  Categoria?: string;
  idDepartamento?: number;
  IdDepartamento?: number;
  departamentoNombre?: string;
  Departamento?: string;
  idTrabajadorAsignado?: number | null;
  IdTrabajadorAsignado?: number | null;
  trabajadorNombre?: string | null;
  TrabajadorNombre?: string | null;
  fechaCreacion?: string;
  FechaCreacion?: string;
  fechaActualizacion?: string;
  FechaActualizacion?: string;
}

interface CategoriaCatalogoBackend {
  idCategoria?: number;
  IdCategoria?: number;
  nombre?: string;
  Nombre?: string;
  idDepartamento?: number;
  IdDepartamento?: number;
  departamentoNombre?: string;
  DepartamentoNombre?: string;
}

const CATEGORIAS_BASE_SJR = [
  { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1, departamento: 'JAPAM' },
  { idCategoria: 2, nombre: 'Alcantarillado', idDepartamento: 1, departamento: 'JAPAM' },
  { idCategoria: 3, nombre: 'Alumbrado', idDepartamento: 2, departamento: 'Servicios Públicos' },
  { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2, departamento: 'Servicios Públicos' },
];

function mapearEstado(idEstado: number): {
  kpi: EstadoKpiCategoria;
  oficial: 'Recibido' | 'En Revisión' | 'En Progreso' | 'Atendido';
} {
  switch (idEstado) {
    case 1:
      return { kpi: 'NUEVO', oficial: 'Recibido' };
    case 2:
      return { kpi: 'EN_PROCESO', oficial: 'En Revisión' };
    case 3:
      return { kpi: 'EN_PROCESO', oficial: 'En Progreso' };
    case 4:
      return { kpi: 'RESUELTO', oficial: 'Atendido' };
    default:
      return { kpi: 'NUEVO', oficial: 'Recibido' };
  }
}

function determinarPrioridad(idCategoria: number): 'Alta' | 'Media' | 'Normal' {
  if (idCategoria === 1) return 'Alta';
  if (idCategoria === 4) return 'Alta';
  if (idCategoria === 2) return 'Media';
  if (idCategoria === 3) return 'Normal';
  return 'Media';
}

function formatearFechaAmigable(fechaIso: string): string {
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return 'Reciente';

    const ahora = new Date();
    const diffMs = ahora.getTime() - fecha.getTime();
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 1) return 'Hace unos momentos';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24 && fecha.getDate() === ahora.getDate()) {
      return `Hoy, ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDias === 1) {
      return `Ayer, ${fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffDias < 7) {
      return `Hace ${diffDias} días`;
    }
    return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  } catch {
    return 'Reciente';
  }
}

export class DashboardApiService implements IDashboardService {
  private readonly baseUrl: string;
  private readonly authService: Pick<IAuthService, 'obtenerToken'>;
  private readonly fallbackService: MockDashboardService;

  constructor(
    authService: Pick<IAuthService, 'obtenerToken'> = new AuthApiService(),
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    fallbackService: MockDashboardService = new MockDashboardService()
  ) {
    this.authService = authService;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fallbackService = fallbackService;
  }

  async obtenerResumenEjecutivo(idDepartamento?: number | null): Promise<DashboardResumenEjecutivo> {
    // Si la aplicación se configuró explícitamente en modo Mock
    if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
      const mapaCategorias = await this.obtenerMapaCategoriasOficiales(idDepartamento);
      return this.fallbackService.obtenerResumenEjecutivo(idDepartamento, mapaCategorias);
    }

    const token = this.authService.obtenerToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const queryDepto =
      idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== 0
        ? `?idDepartamento=${idDepartamento}`
        : '';

    try {
      // 1. Consultar incidencias y catálogo de categorías en paralelo
      const [resIncidencias, resCategorias] = await Promise.all([
        fetch(`${this.baseUrl}/incidencias${queryDepto}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
        fetch(`${this.baseUrl}/catalogos/categorias${queryDepto}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
      ]);

      if (!resIncidencias.ok) {
        throw new Error(`Error ${resIncidencias.status}: No fue posible consultar las incidencias municipales.`);
      }

      const payloadIncidencias = (await resIncidencias.json()) as { data?: IncidenciaBackendRaw[] };
      const rawIncidencias: IncidenciaBackendRaw[] = Array.isArray(payloadIncidencias?.data)
        ? payloadIncidencias.data
        : [];

      let rawCategorias: CategoriaCatalogoBackend[] = [];
      if (resCategorias.ok) {
        const payloadCategorias = (await resCategorias.json()) as { data?: CategoriaCatalogoBackend[] };
        if (Array.isArray(payloadCategorias?.data)) {
          rawCategorias = payloadCategorias.data;
        }
      }

      // 2. Construir lista de categorías oficiales aplicables
      let categoriasAplicables: {
        idCategoria: number;
        nombre: string;
        idDepartamento: number;
        departamento: string;
      }[] = [];

      if (rawCategorias.length > 0) {
        categoriasAplicables = rawCategorias.map((c) => {
          const idCat = Number(c.idCategoria ?? c.IdCategoria);
          const idDep = Number(c.idDepartamento ?? c.IdDepartamento ?? (idCat === 1 || idCat === 2 ? 1 : 2));
          const nombreCat = String(c.nombre ?? c.Nombre ?? 'Sin Nombre').trim();
          const nombreDep = String(
            c.departamentoNombre ?? c.DepartamentoNombre ?? (idDep === 1 ? 'JAPAM' : 'Servicios Públicos')
          ).trim();
          return {
            idCategoria: idCat,
            nombre: nombreCat,
            idDepartamento: idDep,
            departamento: nombreDep,
          };
        });
      } else {
        categoriasAplicables = CATEGORIAS_BASE_SJR.map((c) => ({ ...c }));
      }

      if (idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== 0) {
        categoriasAplicables = categoriasAplicables.filter(
          (c) => c.idDepartamento === Number(idDepartamento)
        );
      }

      const mapaCategorias = new Map<number, string>();
      for (const cat of categoriasAplicables) {
        mapaCategorias.set(cat.idCategoria, cat.nombre);
      }

      // 3. Procesar y filtrar incidencias activas (excluyendo descartadas/rechazadas IdEstado 5)
      const incidenciasProcesadas = rawIncidencias
        .map((item) => {
          const idIncidencia = Number(item.idIncidencia ?? item.IdIncidencia);
          const idCategoria = Number(item.idCategoria ?? item.IdCategoria ?? 1);
          const idDepto = Number(
            item.idDepartamento ?? item.IdDepartamento ?? (idCategoria === 1 || idCategoria === 2 ? 1 : 2)
          );
          const idEstado = Number(item.idEstado ?? item.IdEstado ?? 1);
          const descripcion = String(item.descripcion ?? item.Descripcion ?? '').trim();
          const { kpi, oficial } = mapearEstado(idEstado);

          const categoriaNombre =
            String(item.categoriaNombre ?? item.Categoria ?? '').trim() ||
            mapaCategorias.get(idCategoria) ||
            'General';

          const deptoNombre =
            String(item.departamentoNombre ?? item.Departamento ?? '').trim() ||
            (idDepto === 1 ? 'JAPAM' : 'Servicios Públicos');

          const trabajador =
            item.trabajadorNombre ?? item.TrabajadorNombre ?? null;
          const cuadrillaAsignada =
            typeof trabajador === 'string' && trabajador.trim().length > 0 ? trabajador.trim() : null;

          const fechaCreacionRaw = String(item.fechaCreacion ?? item.FechaCreacion ?? '');
          const fechaActualizacionRaw = item.fechaActualizacion ?? item.FechaActualizacion ?? null;

          return {
            idIncidencia,
            folio: `SJR-2026-${String(idIncidencia).padStart(4, '0')}`,
            descripcion,
            idCategoria,
            categoria: categoriaNombre,
            idDepartamento: idDepto,
            departamento: deptoNombre,
            coloniaUbicacion: 'San Juan del Río, Qro.',
            idEstado,
            estadoKpi: kpi,
            estadoOficial: oficial,
            prioridad: determinarPrioridad(idCategoria),
            fechaCreacionRaw,
            fechaActualizacionRaw,
            fechaCreacion: formatearFechaAmigable(fechaCreacionRaw),
            cuadrillaAsignada,
          };
        })
        .filter((inc) => inc.idEstado !== 5); // Excluir rechazados/descartados del panel activo

      // Filtrado estricto por departamento si viene especificado
      const incidenciasFiltradas =
        idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== 0
          ? incidenciasProcesadas.filter((inc) => inc.idDepartamento === Number(idDepartamento))
          : incidenciasProcesadas;

      // 4. Calcular KPIs Ejecutivos
      const nuevosReportes = incidenciasFiltradas.filter((r) => r.estadoKpi === 'NUEVO').length;
      const enProceso = incidenciasFiltradas.filter((r) => r.estadoKpi === 'EN_PROCESO').length;
      const resueltos = incidenciasFiltradas.filter((r) => r.estadoKpi === 'RESUELTO').length;
      const totalReportes = incidenciasFiltradas.length;
      const tasaResolucion = totalReportes > 0 ? Math.round((resueltos / totalReportes) * 100) : 0;

      // SLA Promedio / Tiempo medio de respuesta en horas
      let sumaHoras = 0;
      let conteoConHoras = 0;
      for (const inc of incidenciasFiltradas) {
        if (inc.fechaCreacionRaw) {
          const tInicio = new Date(inc.fechaCreacionRaw).getTime();
          const tFin = inc.fechaActualizacionRaw ? new Date(inc.fechaActualizacionRaw).getTime() : Date.now();
          if (!isNaN(tInicio) && !isNaN(tFin) && tFin >= tInicio) {
            sumaHoras += (tFin - tInicio) / (1000 * 60 * 60);
            conteoConHoras++;
          }
        }
      }
      const tiempoPromedioRespuestaHoras =
        conteoConHoras > 0 ? Math.round((sumaHoras / conteoConHoras) * 10) / 10 : 0;

      const kpis: DashboardKpiMetrics = {
        nuevosReportes,
        enProceso,
        resueltos,
        totalReportes,
        tasaResolucion,
        tiempoPromedioRespuestaHoras,
      };

      // 5. Calcular desglose por categoría
      const porCategoria: CategoriaMetricItem[] = categoriasAplicables.map((cat) => {
        const delCat = incidenciasFiltradas.filter((r) => r.idCategoria === cat.idCategoria);
        return {
          idCategoria: cat.idCategoria,
          nombre: cat.nombre,
          idDepartamento: cat.idDepartamento,
          departamento: cat.departamento,
          nuevos: delCat.filter((r) => r.estadoKpi === 'NUEVO').length,
          enProceso: delCat.filter((r) => r.estadoKpi === 'EN_PROCESO').length,
          resueltos: delCat.filter((r) => r.estadoKpi === 'RESUELTO').length,
          total: delCat.length,
        };
      });

      // 6. Ordenar reportes recientes por Id descendente (más nuevos primero)
      const reportesRecientes: ReporteEjecutivoReciente[] = incidenciasFiltradas
        .sort((a, b) => b.idIncidencia - a.idIncidencia)
        .map(({ fechaCreacionRaw: _f1, fechaActualizacionRaw: _f2, idEstado: _e, idCategoria: _c, ...resto }) => resto);

      return {
        kpis,
        porCategoria,
        reportesRecientes,
        ultimaActualizacionIso: new Date().toISOString(),
      };
    } catch (error) {
      // En caso de fallo total de red y si estamos en desarrollo, solo registrar el error
      console.error('[DashboardApiService] Error al sincronizar indicadores reales:', error);
      throw error;
    }
  }

  private async obtenerMapaCategoriasOficiales(
    idDepartamento?: number | null
  ): Promise<Map<number, string> | undefined> {
    try {
      const query = idDepartamento ? `?idDepartamento=${idDepartamento}` : '';
      const response = await fetch(`${this.baseUrl}/catalogos/categorias${query}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) return undefined;

      const payload = (await response.json()) as { data?: CategoriaCatalogoBackend[] };
      if (!Array.isArray(payload?.data)) return undefined;

      const mapa = new Map<number, string>();
      for (const item of payload.data) {
        const id = item.idCategoria ?? item.IdCategoria;
        const nombre = item.nombre ?? item.Nombre;
        if (typeof id === 'number' && typeof nombre === 'string' && nombre.trim()) {
          mapa.set(id, nombre.trim());
        }
      }

      return mapa.size > 0 ? mapa : undefined;
    } catch {
      return undefined;
    }
  }
}
