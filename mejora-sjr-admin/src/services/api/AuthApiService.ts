/**
 * AuthApiService.ts
 * Implementación HTTP real para autenticación de funcionarios en Mejora SJR.
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Implementa IAuthService.
 * - LSP (Liskov Substitution Principle): Intercambiable con MockAuthService.
 * - Seguridad Cero Confianza: Almacena el token en cookies para inspección en Middleware de Next.js.
 */

import Cookies from 'js-cookie';
import { IAuthService } from '../contracts/IAuthService';
import { LoginCredentials, AuthResponse, UsuarioSession, DecodedToken } from '../../models/auth.types';

export const TOKEN_COOKIE_NAME = 'mejora_sjr_token';
export const USER_STORAGE_KEY = 'mejora_sjr_user';

export class AuthApiService implements IAuthService {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || 'Error al autenticar credenciales.';
      throw new Error(errorMsg);
    }

    const authResponse = data as AuthResponse;

    if (authResponse.data?.token) {
      // Guardar cookie accesible por el Middleware de Next.js
      Cookies.set(TOKEN_COOKIE_NAME, authResponse.data.token, {
        expires: 1, // 1 día
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      if (typeof window !== 'undefined' && authResponse.data.usuario) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authResponse.data.usuario));
      }
    }

    return authResponse;
  }

  logout(): void {
    Cookies.remove(TOKEN_COOKIE_NAME, { path: '/' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }

  obtenerToken(): string | null {
    return Cookies.get(TOKEN_COOKIE_NAME) || null;
  }

  obtenerUsuario(): UsuarioSession | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioSession;
    } catch {
      return null;
    }
  }

  decodificarToken(tokenParam?: string): DecodedToken | null {
    const token = tokenParam || this.obtenerToken();
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Base64Url decode
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload) as DecodedToken;
    } catch (e) {
      console.error('Error al decodificar JWT:', e);
      return null;
    }
  }
}
