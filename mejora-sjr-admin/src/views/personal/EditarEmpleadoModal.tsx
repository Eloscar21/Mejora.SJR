'use client';

import { useId } from 'react';
import { Modal } from '../../components/ui/Modal';
import type { useEditarEmpleadoViewModel } from '../../viewModels/useEditarEmpleadoViewModel';

interface EditarEmpleadoModalProps {
  viewModel: ReturnType<typeof useEditarEmpleadoViewModel>;
  onCerrar: () => void;
}

/** Presenta el borrador del ViewModel sin modificar el empleado de la tabla. */
export function EditarEmpleadoModal({ viewModel: vm, onCerrar }: EditarEmpleadoModalProps) {
  const id = useId();
  const completado = Boolean(vm.empleadoActualizado);
  const inputClass = (error?: string) =>
    `mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 disabled:bg-slate-100 ${
      error ? 'border-red-500 bg-red-50 focus:ring-red-200' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
    }`;

  return (
    <Modal
      titulo="Editar empleado"
      descripcion="Actualiza el nombre, rol y departamento del empleado seleccionado."
      bloqueado={vm.isSubmitting}
      onCerrar={onCerrar}
    >
      <form
        noValidate
        aria-busy={vm.isSubmitting}
        onSubmit={(event) => { event.preventDefault(); void vm.enviar(); }}
        className="space-y-5 p-6"
      >
        {vm.errorEmpleado && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{vm.errorEmpleado}</p>}
        {vm.errorEnvio && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{vm.errorEnvio}</p>}
        {completado && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Cambios guardados correctamente.</p>}

        <fieldset disabled={vm.isSubmitting || completado || Boolean(vm.errorEmpleado)} className="space-y-4">
          <legend className="sr-only">Datos del empleado seleccionado</legend>
          <div>
            <label htmlFor={`${id}-nombre`} className="text-sm font-medium">Nombre completo</label>
            <input
              id={`${id}-nombre`}
              autoFocus
              autoComplete="name"
              value={vm.form.nombre}
              onChange={(event) => vm.cambiarCampo('nombre', event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(vm.errors.nombre)}
              aria-describedby={vm.errors.nombre ? `${id}-nombre-error` : undefined}
              className={inputClass(vm.errors.nombre)}
            />
            {vm.errors.nombre && <p id={`${id}-nombre-error`} className="mt-1 text-sm text-red-700">{vm.errors.nombre}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-email`} className="text-sm font-medium">Correo electrónico</label>
            <input
              id={`${id}-email`}
              type="email"
              readOnly
              value={vm.email}
              aria-describedby={`${id}-email-ayuda`}
              className={`${inputClass()} bg-slate-100 text-slate-600`}
            />
            <p id={`${id}-email-ayuda`} className="mt-1 text-xs text-slate-500">El correo no se modifica desde este formulario.</p>
          </div>
          <div>
            <label htmlFor={`${id}-rol`} className="text-sm font-medium">Rol</label>
            <select
              id={`${id}-rol`}
              value={vm.form.idRol ?? ''}
              onChange={(event) => vm.cambiarRol(event.target.value)}
              aria-required="true"
              aria-invalid={Boolean(vm.errors.idRol)}
              aria-describedby={vm.errors.idRol ? `${id}-rol-error` : undefined}
              className={inputClass(vm.errors.idRol)}
            >
              <option value="">Selecciona un rol</option>
              <option value="2">Trabajador de campo</option>
              <option value="3">Administrador de departamento</option>
            </select>
            {vm.errors.idRol && <p id={`${id}-rol-error`} className="mt-1 text-sm text-red-700">{vm.errors.idRol}</p>}
          </div>
          <div>
            <label htmlFor={`${id}-departamento`} className="text-sm font-medium">Departamento</label>
            <select
              id={`${id}-departamento`}
              value={vm.form.idDepartamento ?? ''}
              onChange={(event) => vm.cambiarDepartamento(event.target.value)}
              disabled={vm.isLoadingDepartamentos || Boolean(vm.errorDepartamentos)}
              aria-required="true"
              aria-invalid={Boolean(vm.errors.idDepartamento || vm.errorDepartamentos)}
              aria-describedby={vm.errorDepartamentos ? `${id}-catalogo-error` : vm.errors.idDepartamento ? `${id}-departamento-error` : undefined}
              className={inputClass(vm.errors.idDepartamento || vm.errorDepartamentos || undefined)}
            >
              <option value="">{vm.isLoadingDepartamentos ? 'Cargando departamentos…' : 'Selecciona un departamento'}</option>
              {vm.departamentos.map((departamento) => <option key={departamento.idDepartamento} value={departamento.idDepartamento}>{departamento.nombre}</option>)}
            </select>
            {vm.errors.idDepartamento && !vm.errorDepartamentos && <p id={`${id}-departamento-error`} className="mt-1 text-sm text-red-700">{vm.errors.idDepartamento}</p>}
            {vm.errorDepartamentos && (
              <div className="mt-2 space-y-1">
                <p id={`${id}-catalogo-error`} role="alert" className="text-sm text-red-700">{vm.errorDepartamentos}</p>
                <button type="button" onClick={vm.reintentarDepartamentos} className="text-sm font-medium text-blue-700 underline">Reintentar carga</button>
              </div>
            )}
          </div>
        </fieldset>

        <footer className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={onCerrar} disabled={vm.isSubmitting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">{completado ? 'Cerrar' : 'Cancelar'}</button>
          {!completado && <button type="submit" disabled={!vm.puedeEnviar} className="rounded-lg bg-[#0A3D62] px-4 py-2 text-sm font-medium text-white hover:bg-[#082f4b] disabled:cursor-not-allowed disabled:opacity-50">{vm.isSubmitting ? 'Guardando…' : 'Guardar cambios'}</button>}
        </footer>
      </form>
    </Modal>
  );
}
