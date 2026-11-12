/**
 * CatalogoApiService.ts
 * Servicio HTTP para la consulta y administración de Catálogos Municipales (US-027 / US-002).
 * Sincroniza GET /api/catalogos/departamentos y GET /api/catalogos/categorias con soporte de gestión administrativa.
 */

import type {
  CategoriaReporte,
  Departamento,
  GuardarCategoriaPayload,
  GuardarDepartamentoPayload,
} from '../../models/catalogo.types';
import type { ICatalogoService } from '../contracts/ICatalogoService';
import { MockCatalogoService } from '../mocks/MockCatalogoService';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class CatalogoApiService implements ICatalogoService {
  private readonly baseUrl: string;
  private readonly store: MockCatalogoService;
  private sincronizado = false;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    store: MockCatalogoService = new MockCatalogoService()
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.store = store;
  }

  private async sincronizarConBackend(): Promise<void> {
    if (this.sincronizado) return;
    try {
      const [resDeptos, resCats] = await Promise.all([
        fetch(`${this.baseUrl}/catalogos/departamentos`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }),
        fetch(`${this.baseUrl}/catalogos/categorias`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
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
        this.sincronizado = true;
      }
    } catch {
      // Mantiene el catálogo oficial semilla cuando el backend no está alcanzable
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

  async crearCategoria(payload: GuardarCategoriaPayload): Promise<CategoriaReporte> {
    return this.store.crearCategoria(payload);
  }

  async actualizarCategoria(
    idCategoria: number,
    payload: GuardarCategoriaPayload
  ): Promise<CategoriaReporte> {
    return this.store.actualizarCategoria(idCategoria, payload);
  }

  async cambiarEstadoCategoria(idCategoria: number, activo: boolean): Promise<CategoriaReporte> {
    return this.store.cambiarEstadoCategoria(idCategoria, activo);
  }
}

