/**
 * apiConfig.ts
 * Resolución dinámica y resiliente de la URL base de la API para Mejora SJR Mobile.
 * 
 * Regla de negocio y arquitectura:
 * - Evita tener que cambiar la IP manualmente al cambiar de red Wi-Fi o datos móviles.
 * - Si EXPO_PUBLIC_API_URL está definido, lo respeta como prioridad.
 * - Si estamos en desarrollo en Expo Go o emulador, extrae dinámicamente el host
 *   desde Constants.expoConfig?.hostUri / manifest2 (la IP desde la cual Metro sirve la app).
 * - Fallback seguro a localhost:5000/api para web/emulador.
 */

import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  // 1. Si el desarrollador definió una URL explícita (e.g. túnel ngrok o servidor en nube)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('192.168.') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  // 2. Extraer dinámicamente el host desde Expo Go (la IP actual del servidor Metro en cualquier Wi-Fi)
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    // hostUri suele ser "192.168.x.x:8081" o similar
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:5000/api`;
    }
  }

  // 3. Si hay variable de entorno local configurada
  if (envUrl) {
    return envUrl;
  }

  // 4. Fallback por defecto
  return 'http://localhost:5000/api';
}
