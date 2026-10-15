// src/services/contracts/IAuthService.ts
// Contrato que define QUÉ puede hacer el servicio de autenticación.
// El ViewModel depende de esta interfaz, NUNCA de la implementación concreta.
// Principio: Inversión de Dependencias (DIP) + Segregación de Interfaces (ISP).

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  mensaje: string;
}

export interface IAuthService {
  /**
   * Intenta autenticar al usuario con las credenciales dadas.
   * En éxito, el backend setea la HttpOnly cookie automáticamente.
   * En fallo, lanza un Error con el mensaje del servidor.
   */
  login(credentials: LoginCredentials): Promise<LoginResult>;
}
