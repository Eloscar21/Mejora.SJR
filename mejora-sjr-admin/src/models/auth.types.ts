/**
 * auth.types.ts
 * Contratos de datos para el módulo de autenticación del Panel Administrativo Mejora SJR.
 * 
 * Principios aplicados:
 * - ISP (Interface Segregation Principle): Modelos atómicos y específicos para credenciales y tokens.
 * - Desacoplamiento de infraestructura: Define entidades puras independientes de HTTP o storage.
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UsuarioSession {
  idUsuario: number;
  nombre: string;
  email: string;
  idRol: number;
  idDepartamento: number | null;
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

export interface DecodedToken {
  idUsuario: number;
  email: string;
  idRol: number;
  idDepartamento: number | null;
  iat: number;
  exp: number;
}

export const ROLES_SJR = {
  1: 'Ciudadano',
  2: 'Trabajador',
  3: 'Administrador de Departamento',
  4: 'Superadmin / Alcaldía'
} as const;

export const DEPARTAMENTOS_SJR = {
  1: 'JAPAM (Agua y Alcantarillado)',
  2: 'Servicios Públicos Municipales'
} as const;
