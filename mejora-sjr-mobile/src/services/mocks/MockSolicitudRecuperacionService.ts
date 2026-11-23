/**
 * MockSolicitudRecuperacionService.ts
 * Implementación Mock (LSP) de ISolicitudRecuperacionService para pruebas y desarrollo offline.
 */

import type {
  ISolicitudRecuperacionService,
  ResultadoSolicitudRecuperacion,
} from '../contracts/ISolicitudRecuperacionService';

export class MockSolicitudRecuperacionService implements ISolicitudRecuperacionService {
  async solicitarRecuperacion(email: string): Promise<ResultadoSolicitudRecuperacion> {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      throw new Error('Ingresa un correo electrónico válido.');
    }
    return {
      message: `Solicitud simulada enviada para ${trimmed}.`,
    };
  }
}
