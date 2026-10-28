import type { Empleado } from './empleado.types';

/** Selección que la tabla entrega al compositor de formularios. */
export type AccionFormularioPersonal =
  | { tipo: 'crear' }
  | { tipo: 'editar'; empleado: Empleado }
  | { tipo: 'desactivar'; empleado: Empleado };

/** Solo se emite después de una operación confirmada por el servicio. */
export type CambioPersonal =
  | { tipo: 'creado'; empleado: Empleado }
  | { tipo: 'actualizado'; empleado: Empleado }
  | { tipo: 'desactivado'; idUsuario: number };
