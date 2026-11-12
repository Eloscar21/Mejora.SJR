import type { ErrorOperacionPassword } from '../../models/password.types';
import { ApiError } from './ApiError';

/** Un fallo de transporte después del envío no demuestra que la escritura haya fallado. */
export class PasswordApiError extends ApiError implements ErrorOperacionPassword {
  constructor(message: string, status: number | null, public readonly resultadoDesconocido = false) {
    super(message, status);
    this.name = 'PasswordApiError';
  }
}
