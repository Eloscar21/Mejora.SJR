import type { CambioPasswordDTO } from '../../models/password.types';

/** Cambio de la propia cuenta; no incluye login, listados ni recuperación de otras cuentas. */
export interface ICambioPasswordService {
  cambiarPassword(datos: CambioPasswordDTO): Promise<void>;
}
