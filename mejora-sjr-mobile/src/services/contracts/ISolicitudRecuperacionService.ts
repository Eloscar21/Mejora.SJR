/**
 * ISolicitudRecuperacionService.ts
 * Contrato segregado (ISP) para solicitar recuperación asistida de contraseña en móvil (US-028 / US-029).
 */

export interface ResultadoSolicitudRecuperacion {
  message: string;
}

export interface ISolicitudRecuperacionService {
  solicitarRecuperacion(email: string): Promise<ResultadoSolicitudRecuperacion>;
}
