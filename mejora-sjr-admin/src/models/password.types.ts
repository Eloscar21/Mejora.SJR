/** Contratos del cambio propio y de la recuperación asistida (US-029). */
export interface CambioPasswordDTO {
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}

export type EstadoSolicitudPassword = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface SolicitudPassword {
  idSolicitud: number;
  idUsuario: number;
  nombreUsuario: string;
  email: string;
  idRol: number;
  rolNombre: string;
  idDepartamento: number | null;
  departamentoNombre: string | null;
  estado: EstadoSolicitudPassword;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  idSuperadminResolutor: number | null;
  superadminNombre: string | null;
  notasResolucion: string | null;
}

/** US-029 usa generación automática en el backend; no permite elegir la cuenta o clave. */
export interface AprobarSolicitudPasswordDTO {
  notas?: string;
}

export interface RechazarSolicitudPasswordDTO {
  motivo: string;
}

/** Se conserva únicamente en memoria para entregarla al empleado después de confirmar. */
export interface SolicitudPasswordAprobada {
  idSolicitud: number;
  estado: 'APROBADA';
  email: string;
  passwordTemporal: string;
}

export interface SolicitudPasswordRechazada {
  idSolicitud: number;
  estado: 'RECHAZADA';
  motivo: string;
}

/** Contrato de fallos para los ViewModels, sin depender de una clase del adaptador HTTP. */
export interface ErrorOperacionPassword extends Error {
  readonly status: number | null;
  readonly resultadoDesconocido: boolean;
}
