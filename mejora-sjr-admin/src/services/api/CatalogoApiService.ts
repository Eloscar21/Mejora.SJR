/**
 * CatalogoApiService.ts
 * Servicio HTTP para la consulta y administración de Catálogos Municipales (US-027 / US-030 / US-035).
 * Sincroniza GET /api/catalogos/departamentos, GET /api/catalogos/categorias
 * y persiste físicamente nuevas categorías vía POST /api/catalogos/categorias en Azure SQL.
 */

import type {
  CategoriaReporte,
  Departamento,
  GuardarCategoriaPayload,
  GuardarDepartamentoPayload,
} from '../../models/catalogo.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { ICatalogoService } from '../contracts/ICatalogoService';
import { MockCatalogoService } from '../mocks/MockCatalogoService';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class CatalogoApiService implements ICatalogoService {
  private readonly baseUrl: string;
  private readonly store: MockCatalogoService;
  private readonly sesion?: Pick<IAuthService, 'obtenerToken'>;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    store: MockCatalogoService = new MockCatalogoService(),
    sesion?: Pick<IAuthService, 'obtenerToken'>
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.store = store;
    this.sesion = sesion;
  }

  private obtenerHeaders(conJson = false): Record<string, string> {
    const token = this.sesion?.obtenerToken();
    return {
      Accept: 'application/json',
      ...(conJson ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async sincronizarConBackend(): Promise<void> {
    try {
      const headers = this.obtenerHeaders(false);
      const [resDeptos, resCats] = await Promise.all([
        fetch(`${this.baseUrl}/catalogos/departamentos`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
        fetch(`${this.baseUrl}/catalogos/categorias`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        }),
      ]);

      if (resDeptos.ok && resCats.ok) {
        const bodyDeptos = (await resDeptos.json()) as unknown;
        const bodyCats = (await resCats.json()) as unknown;

        const deptosRemotos =
          esObjeto(bodyDeptos) && Array.isArray(bodyDeptos.data)
            ? bodyDeptos.data
                .filter(esObjeto)
                .map((d) => ({
                  idDepartamento: Number(d.idDepartamento ?? d.IdDepartamento),
                  nombre: String(d.nombre ?? d.Nombre ?? '').trim(),
                }))
                .filter((d) => d.idDepartamento > 0 && d.nombre.length > 0)
            : [];

        const catsRemotas =
          esObjeto(bodyCats) && Array.isArray(bodyCats.data)
            ? bodyCats.data
                .filter(esObjeto)
                .map((c) => ({
                  idCategoria: Number(c.idCategoria ?? c.IdCategoria),
                  nombre: String(c.nombre ?? c.Nombre ?? '').trim(),
                  idDepartamento: Number(c.idDepartamento ?? c.IdDepartamento),
                  departamentoNombre:
                    typeof c.departamentoNombre === 'string' ? c.departamentoNombre : undefined,
                }))
                .filter((c) => c.idCategoria > 0 && c.nombre.length > 0)
            : [];

        this.store.sincronizarDesdeRemoto(deptosRemotos, catsRemotas);
      }
    } catch {
      // Mantiene el catálogo en memoria cuando el backend no está alcanzable en modo offline
    }
  }

  async obtenerDepartamentos(): Promise<Departamento[]> {
    await this.sincronizarConBackend();
    return this.store.obtenerDepartamentos();
  }

  async obtenerCategorias(idDepartamento?: number | null): Promise<CategoriaReporte[]> {
    await this.sincronizarConBackend();
    return this.store.obtenerCategorias(idDepartamento);
  }

  async crearDepartamento(payload: GuardarDepartamentoPayload): Promise<Departamento> {
    return this.store.crearDepartamento(payload);
  }

  async actualizarDepartamento(
    idDepartamento: number,
    payload: GuardarDepartamentoPayload
  ): Promise<Departamento> {
    return this.store.actualizarDepartamento(idDepartamento, payload);
  }

  /**
   * US-035: Persiste físicamente la nueva categoría en la tabla Categorias de Azure SQL
   * mediante POST /api/catalogos/categorias con validación RBAC departamental.
   */
  async crearCategoria(payload: GuardarCategoriaPayload): Promise<CategoriaReporte> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/catalogos/categorias`, {
        method: 'POST',
        headers: this.obtenerHeaders(true),
        body: JSON.stringify({
          nombre: payload.nombre.trim(),
          idDepartamento: Number(payload.idDepartamento),
        }),
      });
    } catch {
      return this.store.crearCategoria(payload);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida al crear la categoría.');
    }

    if (!response.ok) {
      const msg =
        esObjeto(body) && typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'No se pudo crear la categoría en el servidor.';
      throw new Error(msg);
    }

    if (!esObjeto(body) || body.success !== true || !esObjeto(body.data)) {
      throw new Error('Respuesta incompleta al crear la categoría.');
    }

    const data = body.data;
    const idCategoria = Number(data.idCategoria ?? data.IdCategoria);
    const nombre = String(data.nombre ?? data.Nombre ?? payload.nombre).trim();
    const idDepartamento = Number(
      data.idDepartamento ?? data.IdDepartamento ?? payload.idDepartamento
    );
    const departamentoNombre =
      typeof data.departamentoNombre === 'string' && data.departamentoNombre.trim()
        ? data.departamentoNombre.trim()
        : idDepartamento === 1
          ? 'JAPAM'
          : 'Servicios Públicos';

    this.store.sincronizarDesdeRemoto([], [
      { idCategoria, nombre, idDepartamento, departamentoNombre },
    ]);

    return {
      idCategoria,
      nombre,
      idDepartamento,
      departamentoNombre,
      descripcion:
        payload.descripcion?.trim() ||
        'Categoría oficial de atención operativa para reportes ciudadanos.',
      prioridad: payload.prioridad || 'Media',
      slaHoras: Number(payload.slaHoras) > 0 ? Number(payload.slaHoras) : 48,
      activo: payload.activo !== undefined ? Boolean(payload.activo) : true,
    };
  }

  /**
   * US-035: Actualiza una categoría existente mediante PUT /api/catalogos/categorias/:id.
   */
  async actualizarCategoria(
    idCategoria: number,
    payload: GuardarCategoriaPayload
  ): Promise<CategoriaReporte> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/catalogos/categorias/${idCategoria}`, {
        method: 'PUT',
        headers: this.obtenerHeaders(true),
        body: JSON.stringify({
          nombre: payload.nombre.trim(),
          idDepartamento: Number(payload.idDepartamento),
        }),
      });
    } catch {
      return this.store.actualizarCategoria(idCategoria, payload);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new Error('El servidor devolvió una respuesta inválida al actualizar la categoría.');
    }

    if (!response.ok) {
      const msg =
        esObjeto(body) && typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'No se pudo actualizar la categoría en el servidor.';
      throw new Error(msg);
    }

    return this.store.actualizarCategoria(idCategoria, payload);
  }

  async cambiarEstadoCategoria(idCategoria: number, activo: boolean): Promise<CategoriaReporte> {
    return this.store.cambiarEstadoCategoria(idCategoria, activo);
  }
}
