import type { CredencialesLogin, RespuestaLoginMovil, SolicitudLoginMovil } from '../../models/Login';
import type { ILoginService } from '../contracts/ILoginService';

export class LoginApiError extends Error {
  readonly status: number | undefined;

  constructor(mensaje: string, status?: number) {
    super(mensaje);
    this.name = 'LoginApiError';
    this.status = status;
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export class LoginApiService implements ILoginService {
  private readonly endpoint: string;
  private readonly http: typeof fetch;

  constructor(baseUrl: string, http: typeof fetch = fetch) {
    this.endpoint = `${baseUrl.replace(/\/+$/, '')}/api/auth/login`;
    this.http = http;
  }

  async login(credenciales: CredencialesLogin): Promise<RespuestaLoginMovil> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      return await this.enviar(credenciales, controller.signal);
    } finally { clearTimeout(timeout); }
  }

  private async enviar(credenciales: CredencialesLogin, signal: AbortSignal): Promise<RespuestaLoginMovil> {
    // Seleccionamos explícitamente los campos: no propagamos roles del cliente.
    const solicitud: SolicitudLoginMovil = {
      email: credenciales.email,
      password: credenciales.password,
      canal: 'movil',
    };

    let respuesta: Response;
    try {
      respuesta = await this.http(this.endpoint, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(solicitud),
        credentials: 'omit',
      });
    } catch {
      throw new LoginApiError('No se pudo conectar con el servidor. Verifica tu conexión.');
    }

    // Los datos externos no se convierten en confiables mediante un cast.
    const payload: unknown = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      const mensaje = respuesta.status < 500 && esObjeto(payload)
        && typeof payload.mensaje === 'string' && payload.mensaje.trim().length > 0
        ? payload.mensaje
        : 'No se pudo iniciar sesión. Inténtalo de nuevo.';
      throw new LoginApiError(mensaje, respuesta.status);
    }

    if (!esObjeto(payload)
      || typeof payload.mensaje !== 'string' || payload.mensaje.trim().length === 0
      || typeof payload.token !== 'string' || payload.token.trim().length === 0) {
      throw new LoginApiError('El servidor devolvió una respuesta de login inválida.', respuesta.status);
    }

    // Validamos la estructura, no la firma criptográfica del JWT.
    return { mensaje: payload.mensaje, token: payload.token };
  }
}
