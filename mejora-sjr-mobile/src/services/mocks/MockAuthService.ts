/**
 * MockAuthService.ts
 * Implementación simulada de autenticación multirrol en memoria para desarrollo y pruebas offline de Mejora SJR Mobile.
 * 
 * Principios aplicados:
 * - LSP (Liskov Substitution Principle): Puede intercambiarse con AuthApiService sin alterar ninguna vista ni ViewModel.
 * - DIP (Dependency Inversion Principle): Implementa IAuthService e inyecta IStorageService.
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

export class MockAuthService implements IAuthService {
  private storage: IStorageService;

  // Base de datos de prueba idéntica a MockUsuarioRepository del Backend (Isaac - US-001)
  private cuentas = [
    {
      idUsuario: 1,
      nombre: 'Ciudadano Juan Pérez',
      email: 'ciudadano@test.com',
      password: 'Password123!',
      idRol: 1,
      idDepartamento: null,
    },
    {
      idUsuario: 2,
      nombre: 'Trabajador Pedro Gómez',
      email: 'trabajador@test.com',
      password: 'Password123!',
      idRol: 2,
      idDepartamento: 1, // JAPAM
    },
    {
      idUsuario: 3,
      nombre: 'Admin María López',
      email: 'admin@test.com',
      password: 'Password123!',
      idRol: 3,
      idDepartamento: 2, // Servicios Públicos
    },
    {
      idUsuario: 4,
      nombre: 'Superadmin Carlos Ruiz',
      email: 'superadmin@test.com',
      password: 'Password123!',
      idRol: 4,
      idDepartamento: null,
    },
  ];

  constructor(storage: IStorageService = defaultStorageService) {
    this.storage = storage;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 450)); // Simulación de latencia de red

    const emailNorm = credentials.email.trim().toLowerCase();
    const usuario = this.cuentas.find((c) => c.email.toLowerCase() === emailNorm);

    // Prevención de enumeración de cuentas: mismo mensaje
    if (!usuario || usuario.password !== credentials.password) {
      throw new Error('Credenciales inválidas.');
    }

    const token = this.generarMockJwt({
      idUsuario: usuario.idUsuario,
      email: usuario.email,
      idRol: usuario.idRol,
      idDepartamento: usuario.idDepartamento,
    });

    const session: UsuarioSession = {
      idUsuario: usuario.idUsuario,
      nombre: usuario.nombre,
      email: usuario.email,
      idRol: usuario.idRol,
      idDepartamento: usuario.idDepartamento,
    };

    await this.storage.setItem(STORAGE_TOKEN_KEY, token);
    await this.storage.setItem(STORAGE_USER_KEY, JSON.stringify(session));

    return {
      success: true,
      message: 'Autenticación exitosa (Mock Mobile).',
      data: {
        usuario: session,
        token,
      },
    };
  }

  async registro(dto: RegistroCiudadanoDTO): Promise<AuthResponse> {
    await new Promise((r) => setTimeout(r, 500));

    const emailNorm = dto.email.trim().toLowerCase();
    const existe = this.cuentas.some((c) => c.email.toLowerCase() === emailNorm);

    if (existe) {
      throw new Error('El correo electrónico ya se encuentra registrado.');
    }

    // Regla de Negocio US-001: Registro exclusivo de Ciudadano (Rol 1, Depto null)
    const nuevoUsuario = {
      idUsuario: this.cuentas.length + 1,
      nombre: dto.nombre.trim(),
      email: emailNorm,
      password: dto.password,
      idRol: 1,
      idDepartamento: null,
    };

    this.cuentas.push(nuevoUsuario);

    const token = this.generarMockJwt({
      idUsuario: nuevoUsuario.idUsuario,
      email: nuevoUsuario.email,
      idRol: nuevoUsuario.idRol,
      idDepartamento: nuevoUsuario.idDepartamento,
    });

    const session: UsuarioSession = {
      idUsuario: nuevoUsuario.idUsuario,
      nombre: nuevoUsuario.nombre,
      email: nuevoUsuario.email,
      idRol: nuevoUsuario.idRol,
      idDepartamento: nuevoUsuario.idDepartamento,
    };

    await this.storage.setItem(STORAGE_TOKEN_KEY, token);
    await this.storage.setItem(STORAGE_USER_KEY, JSON.stringify(session));

    return {
      success: true,
      message: 'Ciudadano registrado exitosamente.',
      data: {
        usuario: session,
        token,
      },
    };
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

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeBase64(payloadBase64);
      return JSON.parse(json) as DecodedToken;
    } catch (e) {
      console.error('[MockAuthService] Error al decodificar JWT:', e);
      return null;
    }
  }

  private generarMockJwt(claims: { idUsuario: number; email: string; idRol: number; idDepartamento: number | null }): string {
    const header = encodeBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const payloadData: DecodedToken = {
      ...claims,
      iat: now,
      exp: now + 86400, // 24 horas
    };
    const payload = encodeBase64(JSON.stringify(payloadData));
    const signature = encodeBase64('mock_signature_mejora_sjr');
    return `${header}.${payload}.${signature}`;
  }
}

// Helpers multiplataforma para codificación Base64 en React Native / Web
function encodeBase64(input: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(input)));
  }
  // Fallback si btoa no está disponible
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = unescape(encodeURIComponent(input));
  let output = '';
  for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || ((map = '='), i % 1); output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error('Carácter inválido para codificación Base64');
    }
    block = (block << 8) | charCode;
  }
  return output;
}

function decodeBase64(input: string): string {
  let str = input.replace(/=+$/, '');
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(str)));
  }
  // Fallback simple
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  str = String(str).replace(/=+$/, '');
  if (str.length % 4 === 1) {
    throw new Error('Longitud de Base64 inválida');
  }
  for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return decodeURIComponent(escape(output));
}
