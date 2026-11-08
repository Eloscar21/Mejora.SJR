import * as SecureStore from 'expo-secure-store';
import type { IStorageService } from '../contracts/IStorageService';

type SecureStoreDriver = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;
type StoredEntries = Record<string, string>;

// Una entrada propia permite implementar clear() sin enumerar el almacén del dispositivo.
const STORAGE_CONTAINER_KEY = 'mejora_sjr_mobile_storage_v1';
// Compartida entre instancias: una lectura o borrado espera las escrituras anteriores.
let pendingOperation: Promise<void> = Promise.resolve();

/** Almacén pequeño de sesión. Los errores nativos se entregan al consumidor. */
export class SecureStorageService implements IStorageService {
  constructor(private readonly driver: SecureStoreDriver = SecureStore) {}

  setItem(key: string, value: string): Promise<void> {
    return this.enqueue(async () => {
      const entries = await this.readEntries();
      entries[key] = value;
      await this.driver.setItemAsync(STORAGE_CONTAINER_KEY, JSON.stringify(entries));
    });
  }

  getItem(key: string): Promise<string | null> {
    return this.enqueue(async () => {
      const entries = await this.readEntries();
      return entries[key] ?? null;
    });
  }

  removeItem(key: string): Promise<void> {
    return this.enqueue(async () => {
      const entries = await this.readEntries();
      if (!(key in entries)) return;
      delete entries[key];

      if (Object.keys(entries).length === 0) {
        await this.driver.deleteItemAsync(STORAGE_CONTAINER_KEY);
      } else {
        await this.driver.setItemAsync(STORAGE_CONTAINER_KEY, JSON.stringify(entries));
      }
    });
  }

  clear(): Promise<void> {
    // También permite limpiar un contenedor cuyo JSON ya no se pueda leer.
    return this.enqueue(() => this.driver.deleteItemAsync(STORAGE_CONTAINER_KEY));
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = pendingOperation.then(operation);
    // El consumidor recibe el rechazo; una operación fallida no bloquea la cola.
    pendingOperation = result.then(() => undefined, () => undefined);
    return result;
  }

  private async readEntries(): Promise<StoredEntries> {
    const raw = await this.driver.getItemAsync(STORAGE_CONTAINER_KEY);
    if (raw === null) return Object.create(null) as StoredEntries;

    let entries: unknown;
    try {
      entries = JSON.parse(raw);
    } catch {
      throw new Error('El almacenamiento de sesión contiene datos inválidos.');
    }

    if (entries === null || typeof entries !== 'object' || Array.isArray(entries) ||
      Object.values(entries).some((value) => typeof value !== 'string')) {
      throw new Error('El almacenamiento de sesión contiene datos inválidos.');
    }

    // Las claves lógicas (@...) son contenido JSON, no claves nativas de SecureStore.
    return Object.assign(Object.create(null), entries) as StoredEntries;
  }
}
