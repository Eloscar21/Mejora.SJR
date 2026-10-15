import type { CredencialesLogin, RespuestaLoginMovil } from '../../models/Login';
import type { ILoginService } from '../contracts/ILoginService';

/** Prueba visual del rechazo y carga: no autentica ni emite tokens. */
export class MockLoginService implements ILoginService {
  async login(_credenciales: CredencialesLogin): Promise<RespuestaLoginMovil> {
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    throw new Error('Prueba de interfaz: no se ha iniciado sesión.');
  }
}
