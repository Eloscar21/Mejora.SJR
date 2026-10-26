/**
 * AuthApiService.ts
 * Implementación HTTP real para autenticación móvil conectada con Express (US-001).
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Implementa IAuthService e inyecta IStorageService.
 * - LSP (Liskov Substitution Principle): Intercambiable con MockAuthService sin romper la aplicación.
 */

import { IAuthService } from '../contracts/IAuthService';
import { IStorageService } from '../contracts/IStorageService';
import { defaultStorageService } from '../storage/StorageService';
import {
  LoginCredentials,
  RegistroCiudadanoDTO,
  AuthResponse,
  UsuarioSession,
  DecodedToken,
} from '../../models/auth.types';

const STORAGE_TOKEN_KEY = '@mejora_sjr_mobile_token';
const STORAGE_USER_KEY = '@mejora_sjr_mobile_user';

export class AuthApiService implements IAuthService {
  private baseUrl: string;
  private storage: IStorageService;

  constructor(
    baseUrl: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
    storage: IStorageService = defaultStorageService
  ) {
    this.baseUrl = baseUrl;
    this.storage = storage;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Error al iniciar sesión.');
    }

    const authResponse = data as AuthResponse;

    if (authResponse.data?.token) {
      await this.storage.setItem(STORAGE_TOKEN_KEY, authResponse.data.token);
    }
    if (authResponse.data?.usuario) {
      await this.storage.setItem(STORAGE_USER_KEY, JSON.stringify(authResponse.data.usuario));
    }

    return authResponse;
  }

  async registro(dto: RegistroCiudadanoDTO): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/registro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        nombre: dto.nombre.trim(),
        email: dto.email.trim().toLowerCase(),
        password: dto.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || 'Error al registrar ciudadano.');
    }

    const authResponse = data as AuthResponse;

    if (authResponse.data?.token) {
      await this.storage.setItem(STORAGE_TOKEN_KEY, authResponse.data.token);
    }
    if (authResponse.data?.usuario) {
      await this.storage.setItem(STORAGE_USER_KEY, JSON.stringify(authResponse.data.usuario));
    }

    return authResponse;
  }

  async logout(): Promise<void> {
    await this.storage.removeItem(STORAGE_TOKEN_KEY);
    await this.storage.removeItem(STORAGE_USER_KEY);
  }

  async obtenerToken(): Promise<string | null> {
    return await this.storage.getItem(STORAGE_TOKEN_KEY);
  }

  async obtenerUsuario(): Promise<UsuarioSession | null> {
    const raw = await this.storage.getItem(STORAGE_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioSession;
    } catch {
      return null;
    }
  }

  decodificarToken(tokenParam?: string): DecodedToken | null {
    if (!tokenParam) return null;
    try {
      const parts = tokenParam.split('.');
      if (parts.length < 2) return null;

      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      if (typeof atob === 'function') {
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(jsonPayload) as DecodedToken;
      }

      return null;
    } catch (e) {
      console.error('[AuthApiService] Error al decodificar JWT:', e);
      return null;
    }
  }
}
