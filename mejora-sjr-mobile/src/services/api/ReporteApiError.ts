/** Conserva el estado HTTP y distingue un resultado de escritura que no pudo confirmarse. */
export class ReporteApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly resultadoDesconocido = false,
  ) {
    super(message);
    this.name = 'ReporteApiError';
  }
}
