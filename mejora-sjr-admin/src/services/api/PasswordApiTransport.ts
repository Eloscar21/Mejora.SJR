import type { IAuthService } from '../contracts/IAuthService';
import { PasswordApiError } from './PasswordApiError';

export function esObjetoPassword(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function esIdPassword(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Transporte interno del módulo; no contiene decisiones de presentación ni de roles. */
export class PasswordApiTransport {
  private readonly baseUrl: string;

  constructor(
    private readonly sesion: Pick<IAuthService, 'obtenerToken'>,
    baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async solicitar(path: string, metodo: 'GET' | 'PATCH', datos?: object): Promise<Record<string, unknown>> {
    const token = this.sesion.obtenerToken();
    if (!token) throw new PasswordApiError('Inicia sesión para acceder a configuración.', 401);

    const escritura = metodo === 'PATCH';
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: metodo,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(datos !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(datos !== undefined ? { body: JSON.stringify(datos) } : {}),
        cache: 'no-store',
        credentials: 'omit',
      });
    } catch {
      throw new PasswordApiError(
        escritura
          ? 'No se pudo confirmar el resultado. La operación podría haberse guardado; no la repitas automáticamente.'
          : 'No se pudo consultar el servidor. Revisa la conexión.',
        null,
        escritura
      );
    }

    // Estos rechazos de la API no confirman una escritura. Un timeout/5xx deja su resultado incierto.
    const resultadoDesconocido = escritura && (response.ok || response.status === 408 || response.status >= 500 || response.status < 400);
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new PasswordApiError('El servidor devolvió una respuesta no válida.', response.status, resultadoDesconocido);
    }
    if (!response.ok) {
      const mensaje = esObjetoPassword(body) && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : 'El servidor rechazó la operación de contraseñas.';
      throw new PasswordApiError(mensaje, response.status, resultadoDesconocido);
    }
    if (response.status !== 200 || !esObjetoPassword(body) || body.success !== true) {
      throw new PasswordApiError('El servidor no confirmó la operación de contraseñas.', response.status, escritura);
    }
    return body;
  }
}
