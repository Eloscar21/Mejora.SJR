/** Helpers puros compartidos por los ViewModels de US-029. */
export function statusPassword(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('status' in error)) return null;
  return typeof error.status === 'number' ? error.status : null;
}

export function mensajePassword(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function resultadoPasswordIncierto(error: unknown): boolean {
  if (typeof error === 'object' && error !== null && 'resultadoDesconocido' in error &&
      typeof error.resultadoDesconocido === 'boolean') return error.resultadoDesconocido;
  const status = statusPassword(error);
  // Un fallo sin contrato no demuestra que la escritura se haya rechazado.
  return status === null || status === 408 || status >= 500 || status < 400;
}

export function bytesPassword(valor: string): number {
  return new TextEncoder().encode(valor).byteLength;
}
