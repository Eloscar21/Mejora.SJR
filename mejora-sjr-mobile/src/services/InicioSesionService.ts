import type { CredencialesLogin } from '../models/Login';
import type { IInicioSesionService } from './contracts/IInicioSesionService';
import type { ILoginService } from './contracts/ILoginService';
import type { ITokenStorage } from './contracts/ITokenStorage';

/** Coordina el caso de uso; no conoce fetch, Expo, vistas ni navegación. */
export class InicioSesionService implements IInicioSesionService {
  private readonly loginService: ILoginService;
  private readonly tokenStorage: ITokenStorage;

  constructor(loginService: ILoginService, tokenStorage: ITokenStorage) {
    this.loginService = loginService;
    this.tokenStorage = tokenStorage;
  }

  async iniciar(credenciales: CredencialesLogin): Promise<void> {
    const respuesta = await this.loginService.login(credenciales);
    try {
      await this.tokenStorage.guardar(respuesta.token);
    } catch {
      // Una escritura fallida puede dejar un token anterior o una escritura parcial.
      try {
        await this.tokenStorage.eliminar();
      } catch {
        throw new Error('No se pudo guardar ni limpiar la sesión del dispositivo. Inténtalo de nuevo.');
      }
      throw new Error('No se pudo guardar la sesión de forma segura. Inténtalo de nuevo.');
    }
  }
}
