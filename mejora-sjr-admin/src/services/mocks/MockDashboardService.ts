/**
 * MockDashboardService.ts
 * Implementación en memoria de indicadores ejecutivos municipales para San Juan del Río (US-014).
 *
 * Principios aplicados:
 * - LSP (Liskov Substitution Principle): Cumple íntegramente el contrato IDashboardService.
 * - Fidelidad de Dominio: Alineado con los catálogos oficiales de schema.sql (JAPAM y Servicios Públicos).
 */

import { IDashboardService } from '../contracts/IDashboardService';
import {
  CategoriaMetricItem,
  DashboardResumenEjecutivo,
  ReporteEjecutivoReciente,
} from '../../models/dashboard.types';

interface RegistroBaseSjr extends ReporteEjecutivoReciente {
  idCategoria: number;
  horasResolucionEstimadas: number;
}

const CATEGORIAS_BASE = [
  { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1, departamento: 'JAPAM' },
  { idCategoria: 2, nombre: 'Alcantarillado', idDepartamento: 1, departamento: 'JAPAM' },
  { idCategoria: 3, nombre: 'Alumbrado', idDepartamento: 2, departamento: 'Servicios Públicos' },
  { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2, departamento: 'Servicios Públicos' },
] as const;

const REPORTES_MUNICIPALES_SJR: RegistroBaseSjr[] = [
  {
    idIncidencia: 1048,
    folio: 'SJR-2026-1048',
    descripcion: 'Fuga de agua potable en toma domiciliaria sobre avenida principal.',
    idCategoria: 1,
    categoria: 'Fugas de agua',
    idDepartamento: 1,
    departamento: 'JAPAM',
    coloniaUbicacion: 'Col. Centro Histórico, Av. Juárez Pte.',
    estadoKpi: 'NUEVO',
    estadoOficial: 'Recibido',
    prioridad: 'Alta',
    fechaCreacion: 'Hace 18 min',
    cuadrillaAsignada: null,
    horasResolucionEstimadas: 6,
  },
  {
    idIncidencia: 1047,
    folio: 'SJR-2026-1047',
    descripcion: 'Luminarias apagadas en circuito peatonal frente a escuela primaria.',
    idCategoria: 3,
    categoria: 'Alumbrado',
    idDepartamento: 2,
    departamento: 'Servicios Públicos',
    coloniaUbicacion: 'Col. San Cayetano, Río Moctezuma',
    estadoKpi: 'NUEVO',
    estadoOficial: 'Recibido',
    prioridad: 'Alta',
    fechaCreacion: 'Hace 42 min',
    cuadrillaAsignada: null,
    horasResolucionEstimadas: 12,
  },
  {
    idIncidencia: 1046,
    folio: 'SJR-2026-1046',
    descripcion: 'Bache profundo en carril derecho de incorporación vehicular.',
    idCategoria: 4,
    categoria: 'Bacheo',
    idDepartamento: 2,
    departamento: 'Servicios Públicos',
    coloniaUbicacion: 'Col. El Pedregoso, Av. Paseo Central',
    estadoKpi: 'EN_PROCESO',
    estadoOficial: 'En Progreso',
    prioridad: 'Alta',
    fechaCreacion: 'Hace 2 horas',
    cuadrillaAsignada: 'Cuadrilla Vial #02',
    horasResolucionEstimadas: 18,
  },
  {
    idIncidencia: 1045,
    folio: 'SJR-2026-1045',
    descripcion: 'Azolve en rejilla pluvial tras precipitación vespertina.',
    idCategoria: 2,
    categoria: 'Alcantarillado',
    idDepartamento: 1,
    departamento: 'JAPAM',
    coloniaUbicacion: 'Col. Indeco, Calle Hidalgo Sur',
    estadoKpi: 'EN_PROCESO',
    estadoOficial: 'En Progreso',
    prioridad: 'Media',
    fechaCreacion: 'Hace 3 horas',
    cuadrillaAsignada: 'Brigada Hidráulica #04',
    horasResolucionEstimadas: 14,
  },
  {
    idIncidencia: 1044,
    folio: 'SJR-2026-1044',
    descripcion: 'Reposición de luminaria LED dañada por variación eléctrica.',
    idCategoria: 3,
    categoria: 'Alumbrado',
    idDepartamento: 2,
    departamento: 'Servicios Públicos',
    coloniaUbicacion: 'Fracc. La Floresta, Paseo de los Abuelos',
    estadoKpi: 'RESUELTO',
    estadoOficial: 'Atendido',
    prioridad: 'Normal',
    fechaCreacion: 'Hoy, 09:15',
    cuadrillaAsignada: 'Cuadrilla Eléctrica #01',
    horasResolucionEstimadas: 8,
  },
  {
    idIncidencia: 1043,
    folio: 'SJR-2026-1043',
    descripcion: 'Reparación de válvula secundaria y sellado de línea hidráulica.',
    idCategoria: 1,
    categoria: 'Fugas de agua',
    idDepartamento: 1,
    departamento: 'JAPAM',
    coloniaUbicacion: 'Col. Granjas Banthí, Calle Durango',
    estadoKpi: 'RESUELTO',
    estadoOficial: 'Atendido',
    prioridad: 'Alta',
    fechaCreacion: 'Hoy, 08:30',
    cuadrillaAsignada: 'Brigada Hidráulica #01',
    horasResolucionEstimadas: 5,
  },
  {
    idIncidencia: 1042,
    folio: 'SJR-2026-1042',
    descripcion: 'Rehabilitación con mezcla asfáltica en tramo de 12 metros.',
    idCategoria: 4,
    categoria: 'Bacheo',
    idDepartamento: 2,
    departamento: 'Servicios Públicos',
    coloniaUbicacion: 'Col. Lomas de San Juan, Av. Universidad',
    estadoKpi: 'RESUELTO',
    estadoOficial: 'Atendido',
    prioridad: 'Media',
    fechaCreacion: 'Ayer, 17:40',
    cuadrillaAsignada: 'Cuadrilla Vial #03',
    horasResolucionEstimadas: 20,
  },
  {
    idIncidencia: 1041,
    folio: 'SJR-2026-1041',
    descripcion: 'Brote de agua en banqueta junto a medidor comercial.',
    idCategoria: 1,
    categoria: 'Fugas de agua',
    idDepartamento: 1,
    departamento: 'JAPAM',
    coloniaUbicacion: 'Col. San Isidro, Calle Corregidora',
    estadoKpi: 'NUEVO',
    estadoOficial: 'Recibido',
    prioridad: 'Media',
    fechaCreacion: 'Ayer, 16:10',
    cuadrillaAsignada: null,
    horasResolucionEstimadas: 10,
  },
  {
    idIncidencia: 1040,
    folio: 'SJR-2026-1040',
    descripcion: 'Inspección técnica de brocal desplazado en vialidad secundaria.',
    idCategoria: 2,
    categoria: 'Alcantarillado',
    idDepartamento: 1,
    departamento: 'JAPAM',
    coloniaUbicacion: 'Col. Vista Hermosa, Av. México',
    estadoKpi: 'EN_PROCESO',
    estadoOficial: 'En Revisión',
    prioridad: 'Media',
    fechaCreacion: 'Ayer, 14:25',
    cuadrillaAsignada: 'Brigada Hidráulica #02',
    horasResolucionEstimadas: 16,
  },
  {
    idIncidencia: 1039,
    folio: 'SJR-2026-1039',
    descripcion: 'Bacheo preventivo en acceso a zona industrial.',
    idCategoria: 4,
    categoria: 'Bacheo',
    idDepartamento: 2,
    departamento: 'Servicios Públicos',
    coloniaUbicacion: 'Parque Industrial Valle de Oro',
    estadoKpi: 'NUEVO',
    estadoOficial: 'Recibido',
    prioridad: 'Media',
    fechaCreacion: 'Ayer, 12:05',
    cuadrillaAsignada: null,
    horasResolucionEstimadas: 22,
  },
  {
    idIncidencia: 1038,
    folio: 'SJR-2026-1038',
    descripcion: 'Sustitución de fotocelda y balastro en poste metálico.',
    idCategoria: 3,
    categoria: 'Alumbrado',
    idDepartamento: 2,
    departamento: 'Servicios Públicos',
    coloniaUbicacion: 'Col. Benito Juárez, Calle Pino Suárez',
    estadoKpi: 'EN_PROCESO',
    estadoOficial: 'En Revisión',
    prioridad: 'Normal',
    fechaCreacion: 'Ayer, 10:50',
    cuadrillaAsignada: 'Cuadrilla Eléctrica #02',
    horasResolucionEstimadas: 15,
  },
  {
    idIncidencia: 1037,
    folio: 'SJR-2026-1037',
    descripcion: 'Desazolve preventivo y limpieza de colector sanitario.',
    idCategoria: 2,
    categoria: 'Alcantarillado',
    idDepartamento: 1,
    departamento: 'JAPAM',
    coloniaUbicacion: 'Comunidad El Rodeo, Calle Principal',
    estadoKpi: 'RESUELTO',
    estadoOficial: 'Atendido',
    prioridad: 'Normal',
    fechaCreacion: 'Hace 2 días',
    cuadrillaAsignada: 'Brigada Hidráulica #03',
    horasResolucionEstimadas: 12,
  },
  {
    idIncidencia: 1036,
    folio: 'SJR-2026-1036',
    descripcion: 'Atención a fuga en red general con reposición de empaque.',
    idCategoria: 1,
    categoria: 'Fugas de agua',
    idDepartamento: 1,
    departamento: 'JAPAM',
    coloniaUbicacion: 'Col. Las Huertas, Priv. de los Naranjos',
    estadoKpi: 'RESUELTO',
    estadoOficial: 'Atendido',
    prioridad: 'Alta',
    fechaCreacion: 'Hace 2 días',
    cuadrillaAsignada: 'Brigada Hidráulica #01',
    horasResolucionEstimadas: 7,
  },
  {
    idIncidencia: 1035,
    folio: 'SJR-2026-1035',
    descripcion: 'Rehabilitación de circuito de alumbrado en parque vecinal.',
    idCategoria: 3,
    categoria: 'Alumbrado',
    idDepartamento: 2,
    departamento: 'Servicios Públicos',
    coloniaUbicacion: 'Col. Fundadores, Andador Central',
    estadoKpi: 'RESUELTO',
    estadoOficial: 'Atendido',
    prioridad: 'Media',
    fechaCreacion: 'Hace 3 días',
    cuadrillaAsignada: 'Cuadrilla Eléctrica #01',
    horasResolucionEstimadas: 9,
  },
];

export class MockDashboardService implements IDashboardService {
  async obtenerResumenEjecutivo(
    idDepartamento?: number | null,
    nombresCategoriasOverride?: Map<number, string>
  ): Promise<DashboardResumenEjecutivo> {
    await new Promise((resolve) => setTimeout(resolve, 180));

    const filtrados = idDepartamento
      ? REPORTES_MUNICIPALES_SJR.filter((item) => item.idDepartamento === idDepartamento)
      : REPORTES_MUNICIPALES_SJR;

    const nuevosReportes = filtrados.filter((r) => r.estadoKpi === 'NUEVO').length;
    const enProceso = filtrados.filter((r) => r.estadoKpi === 'EN_PROCESO').length;
    const resueltos = filtrados.filter((r) => r.estadoKpi === 'RESUELTO').length;
    const totalReportes = filtrados.length;
    const tasaResolucion = totalReportes > 0 ? Math.round((resueltos / totalReportes) * 100) : 0;

    const sumaHoras = filtrados.reduce((acc, item) => acc + item.horasResolucionEstimadas, 0);
    const tiempoPromedioRespuestaHoras =
      totalReportes > 0 ? Math.round((sumaHoras / totalReportes) * 10) / 10 : 0;

    const categoriasAplicables = idDepartamento
      ? CATEGORIAS_BASE.filter((c) => c.idDepartamento === idDepartamento)
      : CATEGORIAS_BASE;

    const porCategoria: CategoriaMetricItem[] = categoriasAplicables.map((cat) => {
      const delCat = filtrados.filter((r) => r.idCategoria === cat.idCategoria);
      const nombreOficial = nombresCategoriasOverride?.get(cat.idCategoria) || cat.nombre;

      return {
        idCategoria: cat.idCategoria,
        nombre: nombreOficial,
        idDepartamento: cat.idDepartamento,
        departamento: cat.departamento,
        nuevos: delCat.filter((r) => r.estadoKpi === 'NUEVO').length,
        enProceso: delCat.filter((r) => r.estadoKpi === 'EN_PROCESO').length,
        resueltos: delCat.filter((r) => r.estadoKpi === 'RESUELTO').length,
        total: delCat.length,
      };
    });

    const reportesRecientes: ReporteEjecutivoReciente[] = filtrados.map(
      ({ idCategoria, horasResolucionEstimadas: _horas, ...resto }) => ({
        ...resto,
        categoria: nombresCategoriasOverride?.get(idCategoria) || resto.categoria,
      })
    );

    return {
      kpis: {
        nuevosReportes,
        enProceso,
        resueltos,
        totalReportes,
        tasaResolucion,
        tiempoPromedioRespuestaHoras,
      },
      porCategoria,
      reportesRecientes,
      ultimaActualizacionIso: new Date().toISOString(),
    };
  }
}

