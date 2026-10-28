'use client';

import { Modal } from '../../components/ui/Modal';
import type { useDesactivarEmpleadoViewModel } from '../../viewModels/useDesactivarEmpleadoViewModel';

interface DesactivarEmpleadoDialogProps {
  viewModel: ReturnType<typeof useDesactivarEmpleadoViewModel>;
  onCerrar: () => void;
}

/** Presenta la confirmación explícita y delega la baja al ViewModel. */
export function DesactivarEmpleadoDialog({ viewModel: vm, onCerrar }: DesactivarEmpleadoDialogProps) {
  return (
    <Modal
      titulo="Desactivar empleado"
      descripcion="¿Estás seguro de desactivar a este usuario?"
      bloqueado={vm.isSubmitting}
      onCerrar={onCerrar}
    >
      <div className="space-y-5 p-6" aria-busy={vm.isSubmitting}>
        <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <dt className="text-slate-500">Nombre</dt>
          <dd className="mt-1 break-words font-medium">{vm.nombre}</dd>
          <dt className="mt-3 text-slate-500">Correo electrónico</dt>
          <dd className="mt-1 break-words">{vm.email}</dd>
        </dl>
        <p className="text-sm text-slate-600">Se marcará al empleado como inactivo. Sus datos no se eliminarán.</p>

        {vm.errorEmpleado && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{vm.errorEmpleado}</p>}
        {vm.errorEnvio && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{vm.errorEnvio}</p>}
        {vm.desactivado && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Empleado desactivado correctamente.</p>}

        <footer className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            autoFocus
            onClick={onCerrar}
            disabled={vm.isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {vm.desactivado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!vm.desactivado && (
            <button
              type="button"
              onClick={() => { void vm.confirmar(); }}
              disabled={!vm.puedeConfirmar}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {vm.isSubmitting ? 'Desactivando…' : 'Desactivar'}
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}
