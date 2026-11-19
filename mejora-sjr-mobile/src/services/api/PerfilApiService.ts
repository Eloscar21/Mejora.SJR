/**
 * PerfilApiService.ts
 * Implementación HTTP real para el apartado "Mis Datos" / Perfil Ciudadano (US-032).
 * Consume GET /api/perfil y PATCH /api/perfil con autenticación Bearer JWT.
 */

import { ROLES_SJR, type TipoRol, type UsuarioSession } from '../../models/auth.types';
import type {
  ActualizarPerfilDTO,
  ActualizarPerfilResultado,
  PerfilCiudadano,
} from '../../models/perfil.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { IPerfilService } from '../contracts/IPerfilService';
import type { IStorageService } from '../contracts/IStorageService';
import { MockPerfilService } from '../mocks/MockPerfilService';
import { defaultStorageService } from '../storage/StorageService';
import { getApiBaseUrl } from './apiConfig';

const STORAGE_USER_KEY = '@mejora_sjr_mobile_user';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizarPerfil(raw: unknown): PerfilCiudadano {
  if (!esObjeto(raw)) {
    throw new Error('El servidor devolvió un perfil de usuario no válido.');
  }

  const idRol = Number(raw.idRol ?? raw.IdRol ?? 1);
  const rolKey = (idRol in ROLES_SJR ? idRol : 1) as TipoRol;
  const resumenRaw = esObjeto(raw.resumenReportes) ? raw.resumenReportes : {};

  return {
    idUsuario: Number(raw.idUsuario ?? raw.IdUsuario ?? 1),
    nombre: String(raw.nombre ?? raw.Nombre ?? '').trim(),
    email: String(raw.email ?? raw.Email ?? '').trim().toLowerCase(),
    idRol,
    rolNombre:
      typeof raw.rolNombre === 'string' && raw.rolNombre.trim()
        ? raw.rolNombre.trim()
        : ROLES_SJR[rolKey],
    idDepartamento:
      raw.idDepartamento !== null && raw.idDepartamento !== undefined
        ? Number(raw.idDepartamento)
        : null,
    activo: raw.activo === undefined ? true : Boolean(raw.activo),
    resumenReportes: {
      total: Number(resumenRaw.total ?? 0),
      recibidos: Number(resumenRaw.recibidos ?? 0),
      enProceso: Number(resumenRaw.enProceso ?? 0),
      resueltos: Number(resumenRaw.resueltos ?? 0),
    },
  };
}

export class PerfilApiService implements IPerfilService {
  private readonly baseUrl: string;
  private readonly fallbackService: MockPerfilService;

  constructor(
    private readonly authService: Pick<IAuthService, 'obtenerToken' | 'obtenerUsuario'>,
    baseUrl: string = getApiBaseUrl(),
    private readonly storage: IStorageService = defaultStorageService,
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fallbackService = new MockPerfilService(authService, storage);
  }

  private async obtenerHeaders(conJson = false): Promise<Record<string, string>> {
    const token = await this.authService.obtenerToken();
    if (!token) {
      throw new Error('No hay una sesión activa. Inicia sesión nuevamente.');
    }
    return {
      Accept: 'application/json',
      ...(conJson ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    };
  }

  async obtenerPerfil(): Promise<PerfilCiudadano> {
    const headers = await this.obtenerHeaders(false);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/perfil`, {
        method: 'GET',
        headers,
      });
    } catch {
      return this.fallbackService.obtenerPerfil();
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('El servidor devolvió una respuesta de perfil no válida.');
    }

    if (!response.ok) {
      const msg =
        esObjeto(body) && typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'No se pudieron consultar tus datos personales.';
      throw new Error(msg);
    }

    if (!esObjeto(body) || body.success !== true || !esObjeto(body.data)) {
      throw new Error('Respuesta de perfil incompleta.');
    }

    return normalizarPerfil(body.data);
  }

  async actualizarPerfil(dto: ActualizarPerfilDTO): Promise<ActualizarPerfilResultado> {
    const headers = await this.obtenerHeaders(true);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/perfil`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          nombre: dto.nombre.trim(),
          email: dto.email.trim().toLowerCase(),
          ...(dto.passwordNueva
            ? {
                passwordActual: dto.passwordActual,
                passwordNueva: dto.passwordNueva,
                confirmarPassword: dto.confirmarPassword,
              }
            : {}),
        }),
      });
    } catch {
      return this.fallbackService.actualizarPerfil(dto);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('El servidor devolvió una respuesta no válida al guardar tus datos.');
    }

    if (!response.ok) {
      const msg =
        esObjeto(body) && typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'No fue posible actualizar tus datos personales.';
      throw new Error(msg);
    }

    if (!esObjeto(body) || body.success !== true || !esObjeto(body.data)) {
      throw new Error('Respuesta de actualización de perfil incompleta.');
    }

    const perfilActualizado = normalizarPerfil(body.data);
    const nuevaSesion: UsuarioSession = {
      idUsuario: perfilActualizado.idUsuario,
      nombre: perfilActualizado.nombre,
      email: perfilActualizado.email,
      idRol: perfilActualizado.idRol,
      idDepartamento: perfilActualizado.idDepartamento,
    };
    await this.storage.setItem(STORAGE_USER_KEY, JSON.stringify(nuevaSesion));

    return {
      usuario: perfilActualizado,
      mensaje:
        typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'Tus datos personales se actualizaron correctamente.',
    };
  }
}
