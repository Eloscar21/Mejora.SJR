/**
 * MockAuthService.ts
 * Implementación simulada de autenticación en memoria para pruebas y desarrollo offline.
 * 
 * Principios aplicados:
 * - LSP (Liskov Substitution Principle): Puede reemplazar a AuthApiService sin romper la UI.
 * - Simulación de los 4 perfiles de MockUsuarioRepository de Isaac.
 */

import Cookies from 'js-cookie';
import { IAuthService } from '../contracts/IAuthService';
import { LoginCredentials, AuthResponse, UsuarioSession, DecodedToken } from '../../models/auth.types';
import { TOKEN_COOKIE_NAME, USER_STORAGE_KEY } from '../api/AuthApiService';

export class MockAuthService implements IAuthService {
  private cuentas = [
    {
      idUsuario: 1,
      nombre: 'Ciudadano Juan',
      email: 'ciudadano@test.com',
      password: 'Password123!',
      idRol: 1,
      idDepartamento: null
    },
    {
      idUsuario: 2,
      nombre: 'Trabajador Pedro',
      email: 'trabajador@test.com',
      password: 'Password123!',
      idRol: 2,
      idDepartamento: 1 // JAPAM
    },
    {
      idUsuario: 3,
      nombre: 'Admin Maria',
      email: 'admin@test.com',
      password: 'Password123!',
      idRol: 3,
      idDepartamento: 2 // Servicios Públicos
    },
    {
      idUsuario: 4,
      nombre: 'Superadmin Carlos',
      email: 'superadmin@test.com',
      password: 'Password123!',
      idRol: 4,
      idDepartamento: null
    }
  ];

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise(r => setTimeout(r, 400)); // Latencia simulada

    const emailNorm = credentials.email.trim().toLowerCase();
    const usuario = this.cuentas.find(c => c.email.toLowerCase() === emailNorm);

    if (!usuario || usuario.password !== credentials.password) {
      throw new Error('Credenciales inválidas.');
    }

    // Generar un JWT simulado válido en base64
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payloadData: DecodedToken = {
      idUsuario: usuario.idUsuario,
      email: usuario.email,
      idRol: usuario.idRol,
      idDepartamento: usuario.idDepartamento,
      iat: now,
      exp: now + 8 * 3600
    };

    const payload = btoa(JSON.stringify(payloadData));
    const signature = btoa('mock_signature_mejora_sjr');
    const token = `${header}.${payload}.${signature}`;

    const session: UsuarioSession = {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      email: usuario.email,
      idRol: usuario.idRol,
      idDepartamento: usuario.idDepartamento
    };

    Cookies.set(TOKEN_COOKIE_NAME, token, { expires: 1, path: '/' });
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session));
    }

    return {
      success: true,
      message: 'Autenticación exitosa (Mock).',
      data: {
        usuario: session,
        token
      }
    };
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
      if (parts.length < 2) return null;
      return JSON.parse(atob(parts[1])) as DecodedToken;
    } catch {
      return null;
    }
  }
}
