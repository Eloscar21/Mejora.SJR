/** Hora de salida en milisegundos desde Unix epoch; separada del JWT. */
export interface ISalidaStorage {
  guardar(instante: number): Promise<void>;
  leer(): Promise<number | null>;
  eliminar(): Promise<void>;
}
