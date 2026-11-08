/**
 * DashboardEjecutivoView.tsx
 * Vista principal del Dashboard Ejecutivo Municipal de Mejora SJR (US-014).
 *
 * Sustituye la antigua pantalla técnica de validación de JWT por un panel de control
 * real, limpio y enfocado en la gestión municipal con tarjetas KPI ("Nuevos Reportes",
 * "En Proceso" y "Resueltos"), desglose por categoría y bandeja de seguimiento ciudadano.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  MapPin,
  RefreshCw,
  TrendingUp,
  Users,
  Wrench,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { KpiMetricCard } from '../../components/dashboard/KpiMetricCard';
import type { useDashboardViewModel } from '../../viewModels/useDashboardViewModel';
import type { EstadoKpiCategoria, FiltroJurisdiccionDepto } from '../../models/dashboard.types';

interface DashboardEjecutivoViewProps {
  viewModel: ReturnType<typeof useDashboardViewModel>;
}

const OPCIONES_JURISDICCION: { valor: FiltroJurisdiccionDepto; etiqueta: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todo el Municipio' },
  { valor: 1, etiqueta: 'JAPAM' },
  { valor: 2, etiqueta: 'Servicios Públicos' },
];

function obtenerBadgeEstado(estado: EstadoKpiCategoria) {
  switch (estado) {
    case 'NUEVO':
      return {
        texto: 'Nuevo Reporte',
        clases: 'bg-sky-50 text-[#0A3D62] border-sky-200',
        punto: 'bg-[#0A3D62]',
      };
    case 'EN_PROCESO':
      return {
        texto: 'En Proceso',
        clases: 'bg-amber-50 text-amber-800 border-amber-200',
        punto: 'bg-amber-500',
      };
    case 'RESUELTO':
      return {
        texto: 'Resuelto',
        clases: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        punto: 'bg-emerald-600',
      };
  }
}

function obtenerClasesPrioridad(prioridad: 'Alta' | 'Media' | 'Normal') {
  if (prioridad === 'Alta') return 'bg-red-50 text-red-700 border-red-200';
  if (prioridad === 'Media') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export const DashboardEjecutivoView: React.FC<DashboardEjecutivoViewProps> = ({
  viewModel: vm,
}) => {
  const kpis = vm.resumen?.kpis ?? {
    nuevosReportes: 0,
    enProceso: 0,
    resueltos: 0,
    totalReportes: 0,
    tasaResolucion: 0,
    tiempoPromedioRespuestaHoras: 0,
  };

  return (
    <div className="space-y-8">
      {/* 1. Encabezado Ejecutivo Municipal */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0A3D62]/10 text-[#0A3D62] border border-[#0A3D62]/20">
              <Building2 className="h-3.5 w-3.5" />
              {vm.jurisdiccionEtiqueta}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 capitalize">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              {vm.fechaInstitucional}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard Ejecutivo de Atención Ciudadana
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            Supervisión operativa en tiempo real de reportes urbanos, órdenes asignadas a cuadrillas
            y eficiencia de resolución en San Juan del Río.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Jurisdicción exclusivo para Superadmin */}
          {vm.esSuperadmin && (
            <div
              className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 border border-slate-200"
              role="group"
              aria-label="Filtrar métricas por dependencia"
            >
              {OPCIONES_JURISDICCION.map((opcion) => {
                const activo = vm.filtroJurisdiccion === opcion.valor;
                return (
                  <button
                    key={String(opcion.valor)}
                    type="button"
                    onClick={() => vm.cambiarJurisdiccion(opcion.valor)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activo
                        ? 'bg-[#0A3D62] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opcion.etiqueta}
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={vm.recargar}
            disabled={vm.isLoading}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${vm.isLoading ? 'animate-spin text-[#0A3D62]' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </section>

      {/* Mensaje de error en caso de fallo de red inesperado */}
      {vm.errorCarga && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center space-x-3 text-red-800 text-sm">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          <span>{vm.errorCarga}</span>
        </div>
      )}

      {/* 2. Tarjetas Principales de Métricas (KPIs Requeridos US-014) */}
      <section aria-label="Indicadores clave de gestión municipal">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <KpiMetricCard
            titulo="Nuevos Reportes"
            valor={vm.isLoading && !vm.resumen ? '—' : kpis.nuevosReportes}
            descripcion="Pendientes de canalización inicial"
            etiquetaEstado="Recibidos"
            icono={Inbox}
            variante="nuevos"
            activo={vm.filtroEstado === 'NUEVO'}
            onClick={() => vm.alternarFiltroEstado('NUEVO')}
          />

          <KpiMetricCard
            titulo="En Proceso"
            valor={vm.isLoading && !vm.resumen ? '—' : kpis.enProceso}
            descripcion="En revisión técnica o cuadrilla en sitio"
            etiquetaEstado="En atención"
            icono={Wrench}
            variante="proceso"
            activo={vm.filtroEstado === 'EN_PROCESO'}
            onClick={() => vm.alternarFiltroEstado('EN_PROCESO')}
          />

          <KpiMetricCard
            titulo="Resueltos"
            valor={vm.isLoading && !vm.resumen ? '—' : kpis.resueltos}
            descripcion="Atendidos con evidencia de cierre"
            etiquetaEstado={`${kpis.tasaResolucion}% efectividad`}
            icono={CheckCircle2}
            variante="resueltos"
            activo={vm.filtroEstado === 'RESUELTO'}
            onClick={() => vm.alternarFiltroEstado('RESUELTO')}
          />

          <KpiMetricCard
            titulo="Total Canalizados"
            valor={vm.isLoading && !vm.resumen ? '—' : kpis.totalReportes}
            descripcion={`Respuesta media: ${kpis.tiempoPromedioRespuestaHoras} h`}
            etiquetaEstado={`Corte ${vm.horaActualizacionTexto}`}
            icono={BarChart3}
            variante="consolidado"
            activo={vm.filtroEstado === 'TODOS'}
            onClick={() => vm.alternarFiltroEstado('TODOS')}
          />
        </div>
      </section>

      {/* 3. Desglose por Categoría y Desempeño Institucional */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Categorías Municipales */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Carga Operativa por Categoría de Servicio
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribución actual de folios entre recepción, cuadrillas en campo y cierres.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {vm.resumen?.porCategoria.length ?? 0} rubros activos
            </span>
          </div>

          <div className="space-y-4">
            {(vm.resumen?.porCategoria ?? []).map((cat) => {
              const pctResueltos = cat.total > 0 ? Math.round((cat.resueltos / cat.total) * 100) : 0;
              const pctProceso = cat.total > 0 ? Math.round((cat.enProceso / cat.total) * 100) : 0;
              const pctNuevos = Math.max(0, 100 - pctResueltos - pctProceso);

              return (
                <div
                  key={cat.idCategoria}
                  className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-sm font-bold text-slate-800">{cat.nombre}</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {cat.departamento}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#0A3D62] font-semibold">{cat.nuevos} nuevos</span>
                      <span className="text-amber-700 font-semibold">{cat.enProceso} en proceso</span>
                      <span className="text-emerald-700 font-semibold">{cat.resueltos} resueltos</span>
                    </div>
                  </div>

                  {/* Barra segmentada */}
                  <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                    {cat.resueltos > 0 && (
                      <div
                        style={{ width: `${pctResueltos}%` }}
                        className="bg-emerald-600 transition-all duration-300"
                        title={`Resueltos: ${cat.resueltos}`}
                      />
                    )}
                    {cat.enProceso > 0 && (
                      <div
                        style={{ width: `${pctProceso}%` }}
                        className="bg-amber-500 transition-all duration-300"
                        title={`En Proceso: ${cat.enProceso}`}
                      />
                    )}
                    {cat.nuevos > 0 && (
                      <div
                        style={{ width: `${pctNuevos}%` }}
                        className="bg-[#0A3D62] transition-all duration-300"
                        title={`Nuevos Reportes: ${cat.nuevos}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tarjeta Ejecutiva Corporativa (#0A3D62) */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0A3D62] to-[#072740] text-white p-6 shadow-lg flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 text-sky-100 border border-white/15">
                <TrendingUp className="h-3.5 w-3.5" />
                Índice de Eficiencia Municipal
              </span>
              <Clock className="h-5 w-5 text-sky-200" />
            </div>

            <div>
              <div className="text-4xl font-extrabold tracking-tight">
                {kpis.tasaResolucion}%
              </div>
              <p className="text-xs text-sky-100/90 mt-1 leading-relaxed">
                Porcentaje de incidencias ciudadanas resueltas satisfactoriamente dentro de la jurisdicción actual.
              </p>
            </div>

            <div className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${kpis.tasaResolucion}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                <span className="text-[11px] text-sky-200 block">SLA Promedio</span>
                <span className="text-lg font-bold text-white">
                  {kpis.tiempoPromedioRespuestaHoras} hrs
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/10 border border-white/10">
                <span className="text-[11px] text-sky-200 block">Perfil Activo</span>
                <span className="text-xs font-bold text-white leading-snug block mt-0.5 truncate">
                  {vm.rolEtiqueta}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/15">
            {vm.esSuperadmin ? (
              <Link
                href="/admin/personal"
                className="w-full inline-flex items-center justify-between px-4 py-2.5 rounded-xl bg-white text-[#0A3D62] text-xs font-bold hover:bg-sky-50 transition-colors shadow-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Administrar Plantilla Municipal
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="text-xs text-sky-100/85 leading-relaxed">
                Supervisión focalizada en <strong>{vm.jurisdiccionEtiqueta}</strong>. Haz clic en cualquier tarjeta KPI superior para filtrar los reportes.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Bandeja Ejecutiva de Reportes Recientes */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Seguimiento Reciente de Reportes Ciudadanos
            </h2>
            <p className="text-xs text-slate-500">
              Últimos folios registrados y estado operativo de atención en campo.
            </p>
          </div>

          {vm.filtroEstado !== 'TODOS' && (
            <button
              type="button"
              onClick={() => vm.alternarFiltroEstado('TODOS')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A3D62]/10 text-[#0A3D62] text-xs font-semibold hover:bg-[#0A3D62]/15 transition-colors self-start sm:self-auto"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filtro activo: {obtenerBadgeEstado(vm.filtroEstado).texto} • Ver todos</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Folio</th>
                <th className="py-3.5 px-4">Incidencia y Ubicación</th>
                <th className="py-3.5 px-4">Categoría / Área</th>
                <th className="py-3.5 px-4">Prioridad</th>
                <th className="py-3.5 px-4">Asignación</th>
                <th className="py-3.5 px-6 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {vm.reportesVisibles.map((reporte) => {
                const badge = obtenerBadgeEstado(reporte.estadoKpi);
                return (
                  <tr
                    key={reporte.idIncidencia}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-4 px-6 whitespace-nowrap">
                      <span className="font-bold text-[#0A3D62] block">{reporte.folio}</span>
                      <span className="text-[11px] text-slate-400">{reporte.fechaCreacion}</span>
                    </td>

                    <td className="py-4 px-4 max-w-md">
                      <p className="font-semibold text-slate-800 line-clamp-1">
                        {reporte.descripcion}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        {reporte.coloniaUbicacion}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 block">
                        {reporte.categoria}
                      </span>
                      <span className="text-[11px] text-slate-500">{reporte.departamento}</span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${obtenerClasesPrioridad(
                          reporte.prioridad
                        )}`}
                      >
                        {reporte.prioridad}
                      </span>
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap text-slate-600">
                      {reporte.cuadrillaAsignada || (
                        <span className="text-slate-400 italic">Por asignar</span>
                      )}
                    </td>

                    <td className="py-4 px-6 whitespace-nowrap text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.clases}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.punto}`} />
                        {badge.texto}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {!vm.isLoading && vm.reportesVisibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    No existen reportes que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

