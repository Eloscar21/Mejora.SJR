/**
 * IStorageService.ts
 * Contrato abstracto para la persistencia local en el dispositivo móvil.
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Desacopla la lógica de AsyncStorage, SecureStore o memoria.
 * - ISP (Interface Segregation Principle): Contrato clave-valor atómico.
 */

export interface IStorageService {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}
