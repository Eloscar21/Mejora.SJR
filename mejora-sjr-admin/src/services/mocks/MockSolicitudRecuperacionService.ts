/**
 * MockSolicitudRecuperacionService.ts
 * Implementación Mock (LSP) de ISolicitudRecuperacionService para pruebas unitarias y desarrollo offline.
 */

import type {
  ISolicitudRecuperacionService,
  ResultadoSolicitudRecuperacion,
} from '../contracts/ISolicitudRecuperacionService';

export class MockSolicitudRecuperacionService implements ISolicitudRecuperacionService {
  async solicitarRecuperacion(email: string): Promise<ResultadoSolicitudRecuperacion> {
    const correo = email.trim().toLowerCase();
    if (!correo || !correo.includes('@')) {
      throw new Error('Ingresa un correo electrónico institucional válido.');
    }
    return {
      message: `Solicitud simulada registrada para ${correo}.`,
    };
  }
}
