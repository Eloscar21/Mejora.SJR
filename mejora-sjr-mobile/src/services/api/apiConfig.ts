/**
 * apiConfig.ts
 * Resolución dinámica y resiliente de la URL base de la API para Mejora SJR Mobile.
 * 
 * Reglas de Arquitectura (Prompt Maestro 2.1):
 * - Fail-Safe: Detección automática de la IP del host Metro en desarrollo local (LAN / Wi-Fi).
 * - Resiliencia ante túneles: Si Expo corre con `--tunnel`, hostUri contiene un dominio
 *   (ej: *.exp.direct), el cual no es una IP local; en ese caso recurre limpiamente a
 *   EXPO_PUBLIC_API_URL o a fallback local.
 * - Cero acoplamiento: No requiere reconfiguración manual al cambiar de red Wi-Fi o datos.
 */

import Constants from 'expo-constants';

export function getApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  // 1. Si Metro está corriendo en red local, hostUri es de la forma "192.168.x.x:8081", "172.20.x.x:8081", etc.
  if (hostUri) {
    const candidateHost = hostUri.split(':')[0];
    // Validar rigurosamente que sea un formato IPv4 numérico y no un túnel exp.direct / ngrok
    const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(candidateHost);
    if (isIpv4) {
      return `http://${candidateHost}:5000/api`;
    }
  }

  // 2. Si hay una variable de entorno definida explícitamente en .env
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  // 3. Fallback seguro para entorno emulador / web local
  return 'http://localhost:5000/api';
}

