/**
 * SolicitudRecuperacionApiService.ts
 * Implementación HTTP de ISolicitudRecuperacionService para la app móvil.
 */

import { getApiBaseUrl } from './apiConfig';
import type {
  ISolicitudRecuperacionService,
  ResultadoSolicitudRecuperacion,
} from '../contracts/ISolicitudRecuperacionService';

export class SolicitudRecuperacionApiService implements ISolicitudRecuperacionService {
  private readonly baseUrl?: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl;
  }

  async solicitarRecuperacion(email: string): Promise<ResultadoSolicitudRecuperacion> {
    const baseUrl = (this.baseUrl || getApiBaseUrl()).replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/solicitudes-password/solicitar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const data = (await response.json()) as { message?: string };

    if (!response.ok) {
      throw new Error(data?.message || 'No se pudo enviar la solicitud.');
    }

    return {
      message:
        data?.message ||
        'Solicitud enviada con éxito. El Superadministrador atenderá tu caso.',
    };
  }
}
