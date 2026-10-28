'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';
import type { usePersonalPruebasViewModel } from '../../viewModels/usePersonalPruebasViewModel';

interface PersonalPruebasViewProps {
  viewModel: ReturnType<typeof usePersonalPruebasViewModel>;
  children?: ReactNode;
}

/** Pantalla de integración: selector sencillo, sin la tabla de US-009. */
export function PersonalPruebasView({ viewModel: vm, children }: PersonalPruebasViewProps) {
  const selectorId = useId();
  if (vm.inicializando) return <p role="status" className="p-6 text-slate-600">Comprobando sesión…</p>;
  if (!vm.puedeGestionar) {
    return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">{vm.errorAcceso}</div>;
  }

  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-blue-700">Integración de formularios</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Personal</h1>
        <p className="mt-2 text-sm text-slate-600">Estas acciones modifican los datos del backend configurado. Utiliza cuentas de prueba.</p>
      </header>

      {vm.mensajeExito && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{vm.mensajeExito}</p>}
      {vm.errorListado && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>No se pudo actualizar el listado: {vm.errorListado}</p>
          {vm.mensajeExito && <p className="mt-1">La operación anterior sí fue confirmada. Reintenta actualizar la lista.</p>}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Abrir formulario</h2>
          <button type="button" onClick={vm.abrirCrear} disabled={Boolean(vm.accion)} className="rounded-lg bg-[#0A3D62] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Nuevo empleado</button>
        </div>

        <div className="mt-6 space-y-3">
          <label htmlFor={selectorId} className="block text-sm font-medium text-slate-700">Empleado para editar o desactivar</label>
          <select
            id={selectorId}
            value={vm.idSeleccionado ?? ''}
            onChange={(event) => vm.seleccionarEmpleado(event.target.value)}
            disabled={vm.isLoading || Boolean(vm.errorListado) || Boolean(vm.accion)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          >
            <option value="">{vm.isLoading ? 'Cargando empleados…' : 'Selecciona un empleado'}</option>
            {vm.empleados.map((empleado) => <option key={empleado.idUsuario} value={empleado.idUsuario}>{empleado.nombre} — {empleado.email}</option>)}
          </select>
          {!vm.isLoading && !vm.errorListado && vm.empleados.length === 0 && <p className="text-sm text-slate-500">No hay empleados activos. Puedes crear uno para comenzar.</p>}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={vm.abrirEditar} disabled={!vm.puedeUsarSeleccion} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">Editar seleccionado</button>
          <button type="button" onClick={vm.abrirDesactivar} disabled={!vm.puedeUsarSeleccion} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50">Desactivar seleccionado</button>
          <button type="button" onClick={vm.recargar} disabled={vm.isLoading || Boolean(vm.accion)} className="rounded-lg px-4 py-2 text-sm font-medium text-blue-700 underline disabled:opacity-50">Actualizar lista</button>
        </div>
      </div>
      {children}
    </section>
  );
}
