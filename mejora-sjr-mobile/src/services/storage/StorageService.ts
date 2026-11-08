/**
 * StorageService.ts
 * Implementación web de IStorageService (localStorage / memoria si no está disponible).
 * Android/iOS resuelven StorageService.native.ts y utilizan SecureStore (US-016).
 * 
 * Principios aplicados:
 * - LSP (Liskov Substitution Principle): Expone el mismo contrato que el adaptador nativo.
 * - SRP: Encargado único de la persistencia de pares clave-valor.
 */

import { IStorageService } from '../contracts/IStorageService';

export class StorageService implements IStorageService {
  private inMemoryFallback: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Fallback a memoria si localStorage está deshabilitado o restringido
    }
    this.inMemoryFallback.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Fallback a memoria
    }
    return this.inMemoryFallback.get(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Fallback a memoria
    }
    this.inMemoryFallback.delete(key);
  }

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
    } catch {
      // Fallback
    }
    this.inMemoryFallback.clear();
  }
}

export const defaultStorageService = new StorageService();
