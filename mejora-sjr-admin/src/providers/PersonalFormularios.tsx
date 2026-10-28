'use client';

import type { Empleado } from '../models/empleado.types';
import type { AccionFormularioPersonal, CambioPersonal } from '../models/personalFormulario.types';
import type { IPersonalServices } from '../services/contracts/IPersonalServices';
import { Modal } from '../components/ui/Modal';
import { useCrearEmpleadoViewModel } from '../viewModels/useCrearEmpleadoViewModel';
import { useEditarEmpleadoViewModel } from '../viewModels/useEditarEmpleadoViewModel';
import { useDesactivarEmpleadoViewModel } from '../viewModels/useDesactivarEmpleadoViewModel';
import { usePersonalFormulariosViewModel } from '../viewModels/usePersonalFormulariosViewModel';
import { CrearEmpleadoModal } from '../views/personal/CrearEmpleadoModal';
import { EditarEmpleadoModal } from '../views/personal/EditarEmpleadoModal';
import { DesactivarEmpleadoDialog } from '../views/personal/DesactivarEmpleadoDialog';

type ServiciosFormulario = Pick<IPersonalServices, 'gestion' | 'departamentos'>;

interface PersonalFormulariosProps {
  accion: AccionFormularioPersonal | null;
  idRolActor: number | null;
  servicios: ServiciosFormulario;
  onCerrar: () => void;
  onCambio: (cambio: CambioPersonal) => void;
}

/** Ensambla hooks y vistas sin implementar ni consultar la tabla de US-009. */
export function PersonalFormularios({ accion, idRolActor, servicios, onCerrar, onCambio }: PersonalFormulariosProps) {
  const vm = usePersonalFormulariosViewModel(idRolActor, onCerrar, onCambio);
  if (!accion) return null;
  if (!vm.puedeGestionar) {
    return (
      <Modal titulo="Acceso restringido" onCerrar={onCerrar}>
        <div className="space-y-4 p-6">
          <p role="alert" className="text-sm text-red-700">{vm.errorAcceso}</p>
          <button type="button" onClick={onCerrar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cerrar</button>
        </div>
      </Modal>
    );
  }

  switch (accion.tipo) {
    case 'crear':
      return <CrearFormulario key="crear" servicios={servicios} onCerrar={onCerrar} onCreado={vm.onCreado} />;
    case 'editar':
      return <EditarFormulario key={`editar-${accion.empleado.idUsuario}`} empleado={accion.empleado} servicios={servicios} onCerrar={onCerrar} onActualizado={vm.onActualizado} />;
    case 'desactivar':
      return <DesactivarFormulario key={`desactivar-${accion.empleado.idUsuario}`} empleado={accion.empleado} servicios={servicios} onCerrar={onCerrar} onDesactivado={vm.onDesactivado} />;
  }
}

function CrearFormulario({ servicios, onCerrar, onCreado }: {
  servicios: ServiciosFormulario;
  onCerrar: () => void;
  onCreado: (empleado: Empleado) => void;
}) {
  const vm = useCrearEmpleadoViewModel(servicios.gestion, servicios.departamentos, onCreado);
  return <CrearEmpleadoModal viewModel={vm} onCerrar={onCerrar} />;
}

function EditarFormulario({ empleado, servicios, onCerrar, onActualizado }: {
  empleado: Empleado;
  servicios: ServiciosFormulario;
  onCerrar: () => void;
  onActualizado: (empleado: Empleado) => void;
}) {
  const vm = useEditarEmpleadoViewModel(empleado, servicios.gestion, servicios.departamentos, onActualizado);
  return <EditarEmpleadoModal viewModel={vm} onCerrar={onCerrar} />;
}

function DesactivarFormulario({ empleado, servicios, onCerrar, onDesactivado }: {
  empleado: Empleado;
  servicios: Pick<ServiciosFormulario, 'gestion'>;
  onCerrar: () => void;
  onDesactivado: (idUsuario: number) => void;
}) {
  const vm = useDesactivarEmpleadoViewModel(empleado, servicios.gestion, onDesactivado);
  return <DesactivarEmpleadoDialog viewModel={vm} onCerrar={onCerrar} />;
}
