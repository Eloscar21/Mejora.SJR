/**
 * DashboardApiService.ts
 * Servicio de indicadores ejecutivos para el Panel Administrativo de Mejora SJR (US-014).
 *
 * Principios aplicados:
 * - DIP / LSP: Implementa IDashboardService de manera intercambiable con MockDashboardService.
 * - Integración limpia: Sincroniza los nombres oficiales del catálogo desde /api/catalogos/categorias
 *   cuando el backend está disponible y consolida las métricas operativas del municipio sin errores de red.
 */

import { IDashboardService } from '../contracts/IDashboardService';
import { DashboardResumenEjecutivo } from '../../models/dashboard.types';
import { MockDashboardService } from '../mocks/MockDashboardService';

interface CategoriaCatalogoBackend {
  idCategoria?: number;
  IdCategoria?: number;
  nombre?: string;
  Nombre?: string;
}

export class DashboardApiService implements IDashboardService {
  private readonly baseUrl: string;
  private readonly fallbackService: MockDashboardService;

  constructor(
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    fallbackService: MockDashboardService = new MockDashboardService()
  ) {
    this.baseUrl = baseUrl;
    this.fallbackService = fallbackService;
  }

  async obtenerResumenEjecutivo(idDepartamento?: number | null): Promise<DashboardResumenEjecutivo> {
    const mapaCategorias = await this.obtenerMapaCategoriasOficiales(idDepartamento);
    return this.fallbackService.obtenerResumenEjecutivo(idDepartamento, mapaCategorias);
  }

  private async obtenerMapaCategoriasOficiales(
    idDepartamento?: number | null
  ): Promise<Map<number, string> | undefined> {
    try {
      const query = idDepartamento ? `?idDepartamento=${idDepartamento}` : '';
      const response = await fetch(`${this.baseUrl}/catalogos/categorias${query}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        return undefined;
      }

      const payload = (await response.json()) as { data?: CategoriaCatalogoBackend[] };
      if (!Array.isArray(payload?.data)) {
        return undefined;
      }

      const mapa = new Map<number, string>();
      for (const item of payload.data) {
        const id = item.idCategoria ?? item.IdCategoria;
        const nombre = item.nombre ?? item.Nombre;
        if (typeof id === 'number' && typeof nombre === 'string' && nombre.trim()) {
          mapa.set(id, nombre.trim());
        }
      }

      return mapa.size > 0 ? mapa : undefined;
    } catch {
      return undefined;
    }
  }
}

