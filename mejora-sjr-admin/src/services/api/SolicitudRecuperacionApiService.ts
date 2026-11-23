/**
 * SolicitudRecuperacionApiService.ts
 * Implementación HTTP de ISolicitudRecuperacionService para solicitar recuperación asistida de contraseña.
 */

import type {
  ISolicitudRecuperacionService,
  ResultadoSolicitudRecuperacion,
} from '../contracts/ISolicitudRecuperacionService';

export class SolicitudRecuperacionApiService implements ISolicitudRecuperacionService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async solicitarRecuperacion(email: string): Promise<ResultadoSolicitudRecuperacion> {
    const res = await fetch(`${this.baseUrl}/solicitudes-password/solicitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    const body = (await res.json()) as { message?: string };
    if (!res.ok && res.status !== 200) {
      throw new Error(body.message || 'No se pudo enviar la solicitud.');
    }

    return {
      message: body.message || 'Solicitud enviada al Superadministrador con éxito.',
    };
  }
}
