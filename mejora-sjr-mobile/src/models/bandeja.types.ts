export type FiltroEstadoTarea = 1 | 2 | 3 | 4 | 5 | null;
export type EstadoVisualTarea = 'recibida' | 'revision' | 'progreso' | 'atendida' | 'rechazada' | 'desconocido';

export interface FiltroBandeja {
  value: FiltroEstadoTarea;
  label: string;
  count: number;
  selected: boolean;
}

/** Datos que necesita la tarjeta; las reglas de selección no pertenecen a la vista. */
export interface TareaBandeja {
  idIncidencia: number;
  categoria: string;
  descripcion: string;
  direccion: string;
  fecha: string;
  reportante: string;
  estadoLabel: string;
  estadoVisual: EstadoVisualTarea;
}
