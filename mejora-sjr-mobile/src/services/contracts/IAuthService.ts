/**
 * IAuthService.ts
 * Contrato abstracto para el servicio de autenticación móvil.
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Los ViewModels dependen de esta abstracción, no de HTTP o mocks.
 * - ISP (Interface Segregation Principle): Contiene exclusivamente operaciones asociadas a credenciales y sesión.
 */

import {
  LoginCredentials,
  RegistroCiudadanoDTO,
  AuthResponse,
  UsuarioSession,
  DecodedToken,
} from '../../models/auth.types';

export interface IAuthService {
  login(credentials: LoginCredentials): Promise<AuthResponse>;
  registro(dto: RegistroCiudadanoDTO): Promise<AuthResponse>;
  logout(): Promise<void>;
  obtenerToken(): Promise<string | null>;
  obtenerUsuario(): Promise<UsuarioSession | null>;
  decodificarToken(token?: string): DecodedToken | null;
}
