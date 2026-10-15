import type { CredencialesLogin } from '../../models/Login';

/** Solo resuelve cuando la autenticación y la persistencia terminaron bien. */
export interface IInicioSesionService {
  iniciar(credenciales: CredencialesLogin): Promise<void>;
}
