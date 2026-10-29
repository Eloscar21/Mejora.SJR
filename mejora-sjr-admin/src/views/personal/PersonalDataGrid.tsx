'use client';

import React, { useId, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Pencil, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  ShieldCheck, 
  AlertCircle,
  Briefcase,
  X
} from 'lucide-react';
import type { Empleado } from '../../models/empleado.types';
import type { IPersonalServices } from '../../services/contracts/IPersonalServices';
import type { usePersonalTableViewModel } from '../../viewModels/usePersonalTableViewModel';
import { PersonalFormularios } from '../../providers/PersonalFormularios';

interface PersonalDataGridProps {
  viewModel: ReturnType<typeof usePersonalTableViewModel>;
  servicios: IPersonalServices;
}

/**
 * PersonalDataGrid
 * Vista de tabla interactiva (DataGrid) para la gestión del personal municipal (US-009).
 * 
 * Requerimientos:
 * - Listado de empleados con filtros reactivos.
 * - Botones de acción: Lápiz (Editar) y Basurero (Desactivar).
 * - Integración con formularios modales y RBAC estricto.
 */
export const PersonalDataGrid: React.FC<PersonalDataGridProps> = ({ viewModel: vm, servicios }) => {
  const searchInputId = useId();
  const rolSelectId = useId();
  const estadoSelectId = useId();

  // Iniciales para el avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // 1. Pantalla de comprobación de sesión
  if (vm.inicializando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Verificando credenciales de acceso...</p>
      </div>
    );
  }

  // 2. Bloqueo RBAC si no es Superadmin (Rol 4)
  if (!vm.puedeGestionar) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-red-200 shadow-sm text-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Acceso Restringido</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          {vm.errorAcceso || 'No cuentas con los permisos de Superadministrador (IdRol = 4) para gestionar personal municipal.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header con Título y Acción Primaria */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Users className="h-3.5 w-3.5" />
            Historia de Usuario US-009 • Gestión de Personal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Personal Municipal (DataGrid)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración integral de cuentas de empleados: trabajadores operativos y directores departamentales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={vm.recargar}
            disabled={vm.isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`h-4 w-4 ${vm.isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={vm.abrirCrear}
            disabled={Boolean(vm.accionModal)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all hover:shadow-lg disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            <span>Nuevo Empleado</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Feedback (Éxito o Error) */}
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

      {/* 3. Error al listar con opción de reintento */}
      {vm.errorListado && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-sm font-medium">Error al cargar listado: {vm.errorListado}</span>
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

      {/* 4. Tarjetas KPI Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registrados</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{vm.metricas.total}</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Personal Activo</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{vm.metricas.activos}</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admins Depto (Rol 3)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-purple-700">{vm.metricas.administradores}</span>
            <Building2 className="h-4 w-4 text-purple-500" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Operativos (Rol 2)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-700">{vm.metricas.trabajadores}</span>
            <Briefcase className="h-4 w-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* 5. Barra de Búsqueda y Filtros */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Input de Búsqueda por texto */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id={searchInputId}
            type="text"
            value={vm.filtroTexto}
            onChange={(e) => vm.setFiltroTexto(e.target.value)}
            placeholder="Buscar por nombre o correo electrónico..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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

        {/* Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Rol */}
          <div className="flex items-center space-x-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              id={rolSelectId}
              value={vm.filtroRol}
              onChange={(e) => vm.setFiltroRol(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
              className="text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los roles</option>
              <option value="2">Rol 2 - Trabajador de Campo</option>
              <option value="3">Rol 3 - Admin Departamental</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <select
            id={estadoSelectId}
            value={vm.filtroEstado}
            onChange={(e) => vm.setFiltroEstado(e.target.value as 'todos' | 'activos' | 'inactivos')}
            className="text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Solo Activos</option>
            <option value="inactivos">Solo Inactivos</option>
          </select>
        </div>
      </div>

      {/* 6. DataGrid Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 w-16">ID</th>
                <th className="py-3.5 px-4">Empleado</th>
                <th className="py-3.5 px-4">Rol Asignado</th>
                <th className="py-3.5 px-4">Departamento</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {vm.isLoading && vm.empleados.length === 0 ? (
                // Skeletons de Carga
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-8" /></td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-slate-200 rounded-full" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 bg-slate-200 rounded w-32" />
                          <div className="h-2.5 bg-slate-100 rounded w-44" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4"><div className="h-5 bg-slate-200 rounded-full w-24" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-slate-200 rounded w-28" /></td>
                    <td className="py-4 px-4"><div className="h-5 bg-slate-200 rounded-full w-16" /></td>
                    <td className="py-4 px-4"><div className="h-8 bg-slate-200 rounded w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : vm.empleados.length === 0 ? (
                // Estado Vacío
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-3">
                    <Users className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-medium">No se encontraron empleados con los filtros seleccionados.</p>
                    {(vm.filtroTexto || vm.filtroRol !== 'todos' || vm.filtroEstado !== 'todos') && (
                      <button
                        type="button"
                        onClick={() => {
                          vm.setFiltroTexto('');
                          vm.setFiltroRol('todos');
                          vm.setFiltroEstado('todos');
                        }}
                        className="text-xs text-blue-600 font-semibold underline hover:text-blue-800"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                // Filas de Datos
                vm.empleados.map((empleado: Empleado) => {
                  const esAdminDepto = empleado.idRol === 3;
                  const deptoNombre = empleado.departamentoNombre || (empleado.idDepartamento ? `Depto #${empleado.idDepartamento}` : 'Sin departamento');

                  return (
                    <tr
                      key={empleado.idUsuario}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        #{String(empleado.idUsuario).padStart(3, '0')}
                      </td>

                      {/* 2. Empleado (Avatar + Nombre + Email) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 ${
                            esAdminDepto ? 'bg-purple-600' : 'bg-blue-600'
                          }`}>
                            {getInitials(empleado.nombre)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {empleado.nombre}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {empleado.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Rol */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            esAdminDepto
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {esAdminDepto ? 'Admin Departamental (3)' : 'Trabajador de Campo (2)'}
                        </span>
                      </td>

                      {/* 4. Departamento */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-600">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]" title={deptoNombre}>
                            {deptoNombre}
                          </span>
                        </div>
                      </td>

                      {/* 5. Estado */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            empleado.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${empleado.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {empleado.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* 6. Botones de Acción: Lápiz (Editar) y Basurero (Desactivar) */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Botón LÁPIZ para Editar */}
                          <button
                            type="button"
                            onClick={() => vm.abrirEditar(empleado)}
                            disabled={Boolean(vm.accionModal)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all shadow-xs disabled:opacity-40"
                            title="Editar empleado (Lápiz)"
                            aria-label={`Editar empleado ${empleado.nombre}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          {/* Botón BASURERO para Desactivar */}
                          <button
                            type="button"
                            onClick={() => vm.abrirDesactivar(empleado)}
                            disabled={!empleado.activo || Boolean(vm.accionModal)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 hover:border-red-300 transition-all shadow-xs disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200"
                            title={empleado.activo ? 'Desactivar empleado (Basurero)' : 'Empleado ya inactivo'}
                            aria-label={`Desactivar empleado ${empleado.nombre}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
            Mostrando <strong>{vm.empleados.length}</strong> de <strong>{vm.totalOriginal}</strong> empleados registrados
          </span>
          <span className="text-[11px] text-slate-400">
            Control de Acceso RBAC • Exclusivo Superadmin (IdRol = 4)
          </span>
        </div>
      </div>

      {/* 7. Compositor de Modales (Crear, Editar, Desactivar) */}
      <PersonalFormularios
        accion={vm.accionModal}
        idRolActor={vm.idRolActor}
        servicios={servicios}
        onCerrar={vm.cerrarModal}
        onCambio={vm.procesarCambio}
      />
    </div>
  );
};
