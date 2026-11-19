/**
 * perfil.types.ts
 * Modelos y contratos de datos para el apartado "Mis Datos" / Perfil Ciudadano en App Móvil (US-032).
 * Cumple con el Principio de Segregación de Interfaces (ISP).
 */

export interface ResumenReportesPerfil {
  total: number;
  recibidos: number;
  enProceso: number;
  resueltos: number;
}

export interface PerfilCiudadano {
  idUsuario: number;
  nombre: string;
  email: string;
  idRol: number;
  rolNombre: string;
  idDepartamento: number | null;
  activo: boolean;
  resumenReportes: ResumenReportesPerfil;
}

export interface ActualizarPerfilDTO {
  nombre: string;
  email: string;
  passwordActual?: string;
  passwordNueva?: string;
  confirmarPassword?: string;
}

export interface ActualizarPerfilResultado {
  usuario: PerfilCiudadano;
  mensaje: string;
}

export interface PerfilFormErrors {
  nombre?: string;
  email?: string;
  passwordActual?: string;
  passwordNueva?: string;
  confirmarPassword?: string;
  general?: string;
}
