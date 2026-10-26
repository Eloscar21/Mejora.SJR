/**
 * auth.types.ts
 * Modelos de datos para el módulo de Autenticación de Mejora SJR Mobile.
 * 
 * Principios aplicados:
 * - ISP (Interface Segregation Principle): Contratos atómicos específicos para credenciales, tokens y sesión.
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistroCiudadanoDTO {
  nombre: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface UsuarioSession {
  idUsuario: number;
  nombre: string;
  email: string;
  idRol: number;
  idDepartamento: number | null;
}

export interface DecodedToken {
  idUsuario: number;
  email: string;
  idRol: number;
  idDepartamento: number | null;
  iat: number;
  exp: number;
}

export interface AuthResponseData {
  usuario: UsuarioSession;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: AuthResponseData;
}

export const ROLES_SJR = {
  1: 'Ciudadano',
  2: 'Trabajador de Campo',
  3: 'Administrador de Departamento',
  4: 'Superadmin / Alcaldía',
} as const;

export const DEPARTAMENTOS_SJR = {
  1: 'JAPAM (Agua Potable y Alcantarillado)',
  2: 'Servicios Públicos Municipales',
} as const;

export type TipoRol = keyof typeof ROLES_SJR;
export type TipoDepartamento = keyof typeof DEPARTAMENTOS_SJR;
