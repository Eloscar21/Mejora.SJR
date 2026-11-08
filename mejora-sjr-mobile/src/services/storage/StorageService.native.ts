import { SecureStorageService } from './SecureStorageService';

// Metro selecciona este módulo en Android/iOS para los imports sin extensión.
export { SecureStorageService as StorageService };
export const defaultStorageService = new SecureStorageService();
