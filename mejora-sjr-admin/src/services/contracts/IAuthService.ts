/**
 * IAuthService.ts
 * Contrato formal para el servicio de autenticación web.
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Los ViewModels dependen de este contrato, nunca de Axios/Fetch directo.
 * - ISP (Interface Segregation Principle): Contiene exclusivamente operaciones de sesión de usuario.
 */

import { LoginCredentials, AuthResponse, UsuarioSession, DecodedToken } from '../../models/auth.types';

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  logout(): void;
  obtenerToken(): string | null;
  obtenerUsuario(): UsuarioSession | null;
  decodificarToken(token?: string): DecodedToken | null;
}
