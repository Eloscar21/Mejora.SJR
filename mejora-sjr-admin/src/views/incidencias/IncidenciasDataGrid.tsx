'use client';

import React, { useId } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
  X,
  XCircle,
  Camera,
} from 'lucide-react';
import type { Incidencia } from '../../models/incidencia.types';
import type { useIncidenciasViewModel } from '../../viewModels/useIncidenciasViewModel';
import { IntercepcionErrorView } from '../errors/IntercepcionErrorView';
import { DescartarIncidenciaModal } from './DescartarIncidenciaModal';

interface IncidenciasDataGridProps {
  viewModel: ReturnType<typeof useIncidenciasViewModel>;
}

/**
 * IncidenciasDataGrid
 * Vista de Bandeja de Incidencias en Admin (DataGrid y Acciones - US-026).
 *
 * Incluye:
 * - Filtros por secretaría (JAPAM / Servicios Públicos), estado y texto.
 * - Contadores KPI reactivos en la parte superior.
 * - Selector de asignación a trabajador operativo (Rol 2) por fila.
 * - Botón y modal para descartar reportes falsos con motivo de auditoría.
 */
export const IncidenciasDataGrid: React.FC<IncidenciasDataGridProps> = ({ viewModel: vm }) => {
  const searchInputId = useId();
  const secretariaSelectId = useId();
  const estadoSelectId = useId();

  if (vm.inicializando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Cargando bandeja de incidencias...</p>
      </div>
    );
  }

  if (!vm.puedeAcceder) {
    return <IntercepcionErrorView codigo={403} modo="embebido" />;
  }

  const hayFiltrosActivos =
    Boolean(vm.filtroTexto.trim()) ||
    vm.filtroEstado !== 'todos' ||
    (vm.puedeCambiarSecretaria && vm.filtroSecretaria !== 'todos');

  const renderBadgeEstado = (inc: Incidencia) => {
    const estado = Number(inc.idEstado);
    if (estado === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Recibido
        </span>
      );
    }
    if (estado === 2 || estado === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          {inc.estadoNombre || 'En Revisión'}
        </span>
      );
    }
    if (estado === 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Resuelto
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Rechazado / Falso
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <AlertCircle className="h-3.5 w-3.5" />
            Bandeja Operativa Municipal • US-026
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bandeja de Incidencias Ciudadanas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {vm.puedeCambiarSecretaria
              ? 'Supervisión global por secretaría, asignación a trabajadores operativos y descarte de reportes falsos.'
              : `Gestión operativa y asignación de cuadrillas para tu secretaría (${
                  vm.idDepartamentoActor === 1 ? 'JAPAM' : 'Servicios Públicos'
                }).`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={vm.recargar}
            disabled={vm.isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${vm.isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Actualizar Bandeja</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Feedback */}
      {vm.feedback && (
        <div
          role="status"
          className={`flex items-center justify-between p-4 rounded-xl border text-sm transition-all ${
            vm.feedback.tipo === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {vm.feedback.tipo === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{vm.feedback.texto}</span>
          </div>
          <button
            type="button"
            onClick={vm.limpiarFeedback}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3. Error de listado */}
      {vm.errorListado && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm font-medium">{vm.errorListado}</span>
          </div>
          <button
            type="button"
            onClick={vm.recargar}
            className="text-xs font-semibold text-red-700 underline hover:text-red-900"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* 4. Tarjetas KPI Superiores Reactivas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => vm.setFiltroEstado('todos')}
          className={`p-4 rounded-xl bg-white border text-left transition-all shadow-sm hover:border-blue-300 ${
            vm.filtroEstado === 'todos'
              ? 'border-blue-400 ring-1 ring-blue-400/30'
              : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total en Bandeja
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{vm.metricas.total}</span>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => vm.setFiltroEstado(vm.filtroEstado === 1 ? 'todos' : 1)}
          className={`p-4 rounded-xl bg-white border text-left transition-all shadow-sm hover:border-amber-300 ${
            vm.filtroEstado === 1
              ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/20'
              : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Nuevos (Recibidos)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-700">{vm.metricas.recibidos}</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => vm.setFiltroEstado(vm.filtroEstado === 2 ? 'todos' : 2)}
          className={`p-4 rounded-xl bg-white border text-left transition-all shadow-sm hover:border-blue-300 ${
            vm.filtroEstado === 2
              ? 'border-blue-500 ring-1 ring-blue-500/30 bg-blue-50/20'
              : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            En Revisión / Proceso
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-700">{vm.metricas.enProceso}</span>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => vm.setFiltroEstado(vm.filtroEstado === 4 ? 'todos' : 4)}
          className={`p-4 rounded-xl bg-white border text-left transition-all shadow-sm hover:border-emerald-300 ${
            vm.filtroEstado === 4
              ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-50/20'
              : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Resueltos
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{vm.metricas.resueltos}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => vm.setFiltroEstado(vm.filtroEstado === 5 ? 'todos' : 5)}
          className={`p-4 rounded-xl bg-white border text-left transition-all shadow-sm hover:border-red-300 ${
            vm.filtroEstado === 5
              ? 'border-red-500 ring-1 ring-red-500/30 bg-red-50/20'
              : 'border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Descartados (Falsos)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-red-700">{vm.metricas.descartados}</span>
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
        </button>
      </div>

      {/* 5. Barra de Búsqueda y Filtros por Secretaría y Estado */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id={searchInputId}
            type="text"
            value={vm.filtroTexto}
            onChange={(e) => vm.setFiltroTexto(e.target.value)}
            placeholder="Buscar por folio (#INC-101), descripción, categoría o ciudadano..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {vm.filtroTexto && (
            <button
              type="button"
              onClick={() => vm.setFiltroTexto('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Secretaría / Dependencia */}
          <div className="flex items-center space-x-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              id={secretariaSelectId}
              aria-label="Filtrar por secretaría"
              value={String(vm.filtroSecretaria)}
              disabled={!vm.puedeCambiarSecretaria}
              onChange={(e) => {
                const val = e.target.value;
                vm.setFiltroSecretaria(val === 'todos' ? 'todos' : Number(val));
              }}
              className="text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {vm.puedeCambiarSecretaria && <option value="todos">Todas las secretarías</option>}
              <option value="1">Secretaría 1 - JAPAM (Agua y Drenaje)</option>
              <option value="2">Secretaría 2 - Servicios Públicos</option>
            </select>
          </div>

          {/* Selector de Estado */}
          <select
            id={estadoSelectId}
            aria-label="Filtrar por estado de incidencia"
            value={String(vm.filtroEstado)}
            onChange={(e) => {
              const val = e.target.value;
              vm.setFiltroEstado(val === 'todos' ? 'todos' : Number(val));
            }}
            className="text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="1">1 - Recibido (Nuevo)</option>
            <option value="2">2 - En Revisión (Asignado)</option>
            <option value="3">3 - En Progreso</option>
            <option value="4">4 - Resuelto</option>
            <option value="5">5 - Rechazado / Falso</option>
          </select>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={vm.limpiarFiltros}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* 6. Tabla DataGrid de Incidencias */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 w-24">Folio</th>
                <th className="py-3.5 px-4">Reporte Ciudadano y Ubicación</th>
                <th className="py-3.5 px-4">Secretaría / Categoría</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 w-72">Asignación a Trabajador</th>
                <th className="py-3.5 px-4 text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {vm.incidencias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-3">
                    <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-medium">
                      No se encontraron incidencias con los filtros seleccionados.
                    </p>
                  </td>
                </tr>
              ) : (
                vm.incidencias.map((inc) => {
                  const folio = `#INC-${String(inc.idIncidencia).padStart(3, '0')}`;
                  const esRechazada = Number(inc.idEstado) === 5;
                  const esResuelta = Number(inc.idEstado) === 4;
                  const trabajadoresDepto = vm.obtenerTrabajadoresPorDepto(inc.idDepartamento);
                  const valorSelector =
                    vm.seleccionTrabajador[inc.idIncidencia] ?? inc.idTrabajadorAsignado ?? '';

                  return (
                    <tr
                      key={inc.idIncidencia}
                      className="hover:bg-slate-50/80 transition-colors align-top"
                    >
                      {/* 1. Folio */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-700">
                        <div>{folio}</div>
                        <span className="text-[10px] font-normal text-slate-400 block mt-0.5">
                          {new Date(inc.fechaCreacion).toLocaleDateString('es-MX')}
                        </span>
                      </td>

                      {/* 2. Descripción, Ciudadano, Coordenadas y Evidencia */}
                      <td className="py-4 px-4 space-y-1.5 max-w-md">
                        <p className="font-medium text-slate-800 leading-snug">
                          {inc.descripcion}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-500" />
                            {inc.latitud.toFixed(4)}, {inc.longitud.toFixed(4)}
                          </span>
                          <span>Reportó: {inc.ciudadanoNombre || 'Ciudadano SJR'}</span>
                          {inc.fotoInicialUrl && (
                            <a
                              href={inc.fotoInicialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                            >
                              <Camera className="h-3 w-3" />
                              Ver evidencia
                            </a>
                          )}
                        </div>
                        {inc.motivoRechazo && (
                          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">
                            <strong>Motivo de descarte:</strong> {inc.motivoRechazo}
                          </div>
                        )}
                      </td>

                      {/* 3. Secretaría y Categoría */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          <Building2 className="h-3 w-3 text-blue-600" />
                          {inc.departamentoNombre}
                        </div>
                        <div className="mt-1 font-semibold text-slate-700">
                          {inc.categoriaNombre}
                        </div>
                      </td>

                      {/* 4. Estado */}
                      <td className="py-4 px-4">{renderBadgeEstado(inc)}</td>

                      {/* 5. Selector de Asignación a Trabajador */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <select
                              aria-label={`Asignar trabajador a incidencia ${folio}`}
                              value={String(valorSelector)}
                              disabled={esRechazada || esResuelta || vm.asignandoId === inc.idIncidencia}
                              onChange={(e) =>
                                vm.seleccionarTrabajadorFila(
                                  inc.idIncidencia,
                                  Number(e.target.value)
                                )
                              }
                              className="flex-1 text-xs rounded-lg border border-slate-300 py-1.5 px-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              <option value="">Seleccionar trabajador...</option>
                              {trabajadoresDepto.map((trab) => (
                                <option key={trab.idUsuario} value={trab.idUsuario}>
                                  {trab.nombre}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => vm.asignarTrabajador(inc.idIncidencia)}
                              disabled={
                                esRechazada ||
                                esResuelta ||
                                !valorSelector ||
                                vm.asignandoId === inc.idIncidencia
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-40"
                            >
                              {vm.asignandoId === inc.idIncidencia ? '...' : 'Asignar'}
                            </button>
                          </div>
                          {inc.trabajadorNombre && (
                            <p className="text-[11px] text-emerald-700 font-medium">
                              Asignado a: {inc.trabajadorNombre}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 6. Acción Descartar Falso */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => vm.abrirModalDescartar(inc)}
                          disabled={esRechazada || esResuelta}
                          aria-label={`Descartar reporte falso ${folio}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:hover:bg-red-50/70"
                          title={
                            esRechazada
                              ? 'Este reporte ya fue descartado'
                              : 'Descartar como reporte falso o improcedente'
                          }
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span>Descartar Falso</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer del DataGrid */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Mostrando <strong>{vm.incidencias.length}</strong> de{' '}
            <strong>{vm.totalOriginal}</strong> incidencias registradas
          </span>
          <span className="text-[11px] text-slate-400">
            {vm.puedeCambiarSecretaria
              ? 'Jurisdicción Municipal Completa • Superadmin'
              : `Aislamiento Departamental RBAC • Secretaría #${vm.idDepartamentoActor}`}
          </span>
        </div>
      </div>

      {/* 7. Modal para Descartar Reportes Falsos */}
      <DescartarIncidenciaModal
        incidencia={vm.incidenciaADescartar}
        motivo={vm.motivoDescarte}
        errorMotivo={vm.errorMotivoDescarte}
        descartando={vm.descartando}
        onCambiarMotivo={vm.setMotivoDescarte}
        onConfirmar={vm.confirmarDescarteFalso}
        onCerrar={vm.cerrarModalDescartar}
      />
    </div>
  );
};

