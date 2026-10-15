import type { IRenovacionService } from '../contracts/IRenovacionService';

export class RenovacionApiError extends Error {
  readonly status: number | undefined;
  constructor(mensaje: string, status?: number) {
    super(mensaje);
    this.name = 'RenovacionApiError';
    this.status = status;
  }
}

export class RenovacionApiService implements IRenovacionService {
  private readonly endpoint: string;
  private readonly http: typeof fetch;
  constructor(baseUrl: string, http: typeof fetch = fetch) {
    this.endpoint = `${baseUrl.replace(/\/+$/, '')}/api/auth/renovar`;
    this.http = http;
  }

  async renovar(token: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const respuesta = await this.http(this.endpoint, {
        method: 'POST', credentials: 'omit', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (!respuesta.ok) throw new RenovacionApiError('No se pudo verificar la sesión.', respuesta.status);
      const datos: unknown = await respuesta.json();
      if (!datos || typeof datos !== 'object' || !('token' in datos)
        || typeof datos.token !== 'string' || !datos.token.trim()) {
        throw new RenovacionApiError('Respuesta de renovación inválida.');
      }
      return datos.token;
    } catch (error) {
      if (error instanceof RenovacionApiError) throw error;
      throw new RenovacionApiError('No se pudo conectar para verificar la sesión. Inténtalo de nuevo.');
    } finally { clearTimeout(timeout); }
  }
}
