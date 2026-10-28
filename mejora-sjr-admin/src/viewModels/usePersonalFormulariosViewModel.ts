'use client';

import { useCallback } from 'react';
import type { Empleado } from '../models/empleado.types';
import type { CambioPersonal } from '../models/personalFormulario.types';

/** Coordina acceso visual y notificación al listado; no ejecuta mutaciones. */
export function usePersonalFormulariosViewModel(
  idRolActor: number | null,
  onCerrar: () => void,
  onCambio: (cambio: CambioPersonal) => void
) {
  const puedeGestionar = idRolActor === 4;

  const notificarCambio = useCallback((cambio: CambioPersonal) => {
    if (!puedeGestionar) return;
    onCerrar();
    onCambio(cambio);
  }, [puedeGestionar, onCerrar, onCambio]);

  return {
    puedeGestionar,
    errorAcceso: puedeGestionar ? null : 'La gestión de personal está disponible solo para el superadministrador.',
    onCreado: (empleado: Empleado) => notificarCambio({ tipo: 'creado', empleado }),
    onActualizado: (empleado: Empleado) => notificarCambio({ tipo: 'actualizado', empleado }),
    onDesactivado: (idUsuario: number) => notificarCambio({ tipo: 'desactivado', idUsuario }),
  };
}
