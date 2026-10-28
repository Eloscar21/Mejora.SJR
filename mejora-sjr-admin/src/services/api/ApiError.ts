/** Error de transporte o contrato; status es null cuando no hubo respuesta HTTP. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number | null) {
    super(message);
    this.name = 'ApiError';
  }
}
