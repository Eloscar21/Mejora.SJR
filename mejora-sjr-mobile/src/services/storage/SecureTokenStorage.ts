import type * as SecureStore from 'expo-secure-store';
import type { ITokenStorage } from '../contracts/ITokenStorage';

type SecureStoreApi = Pick<typeof SecureStore,
  'setItemAsync' | 'getItemAsync' | 'deleteItemAsync'>;

const TOKEN_KEY = 'mejora_sjr.auth.token.v1';

/** Recibe el módulo nativo desde la raíz de composición; permite pruebas sin teléfono. */
export class SecureTokenStorage implements ITokenStorage {
  private readonly secureStore: SecureStoreApi;

  constructor(secureStore: SecureStoreApi) {
    this.secureStore = secureStore;
  }

  async guardar(token: string): Promise<void> {
    if (typeof token !== 'string' || token.trim().length === 0) {
      throw new Error('No se puede guardar un token vacío.');
    }
    // No guardamos contraseñas ni registramos el token en consola.
    await this.secureStore.setItemAsync(TOKEN_KEY, token);
  }

  async leer(): Promise<string | null> {
    const token = await this.secureStore.getItemAsync(TOKEN_KEY);
    if (token !== null && (typeof token !== 'string' || token.trim().length === 0)) {
      throw new Error('El token almacenado no tiene un formato válido.');
    }
    return token;
  }

  async eliminar(): Promise<void> {
    await this.secureStore.deleteItemAsync(TOKEN_KEY);
  }
}
