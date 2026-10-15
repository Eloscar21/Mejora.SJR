import type * as SecureStore from 'expo-secure-store';
import type { ISalidaStorage } from '../contracts/ISalidaStorage';

type SecureStoreApi = Pick<typeof SecureStore, 'setItemAsync' | 'getItemAsync' | 'deleteItemAsync'>;
const SALIDA_KEY = 'mejora_sjr.auth.salida.v1';

export class SecureSalidaStorage implements ISalidaStorage {
  private readonly secureStore: SecureStoreApi;

  constructor(secureStore: SecureStoreApi) {
    this.secureStore = secureStore;
  }

  async guardar(instante: number): Promise<void> {
    if (!Number.isSafeInteger(instante) || instante < 0) {
      throw new Error('La hora de salida no es válida.');
    }
    await this.secureStore.setItemAsync(SALIDA_KEY, JSON.stringify(instante));
  }

  async leer(): Promise<number | null> {
    const contenido = await this.secureStore.getItemAsync(SALIDA_KEY);
    if (contenido === null) return null;
    let valor: unknown;
    try {
      valor = JSON.parse(contenido);
    } catch {
      throw new Error('La hora de salida guardada no es válida.');
    }
    if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 0) {
      throw new Error('La hora de salida guardada no es válida.');
    }
    return valor;
  }

  async eliminar(): Promise<void> {
    await this.secureStore.deleteItemAsync(SALIDA_KEY);
  }
}
