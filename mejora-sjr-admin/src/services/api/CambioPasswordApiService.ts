import type { CambioPasswordDTO } from '../../models/password.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { ICambioPasswordService } from '../contracts/ICambioPasswordService';
import { PasswordApiError } from './PasswordApiError';
import { PasswordApiTransport } from './PasswordApiTransport';

export class CambioPasswordApiService implements ICambioPasswordService {
  private readonly http: PasswordApiTransport;

  constructor(sesion: Pick<IAuthService, 'obtenerToken'>, baseUrl?: string, fetcher?: typeof fetch) {
    this.http = new PasswordApiTransport(sesion, baseUrl, fetcher);
  }

  async cambiarPassword(datos: CambioPasswordDTO): Promise<void> {
    const { passwordActual, passwordNueva, confirmarPassword } = datos;
    const body = await this.http.solicitar('/auth/password', 'PATCH', {
      passwordActual, passwordNueva, confirmarPassword,
    });
    if (typeof body.message !== 'string' || !body.message.trim()) {
      throw new PasswordApiError('No se recibió la confirmación del cambio de contraseña.', 200, true);
    }
  }
}
