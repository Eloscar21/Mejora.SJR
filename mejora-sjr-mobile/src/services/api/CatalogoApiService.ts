/**
 * CatalogoApiService.ts
 * Implementación HTTP real para consulta de catálogos municipales (US-002 / US-004).
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Implementa ICatalogoService.
 * - LSP (Liskov Substitution Principle): Intercambiable con MockCatalogoService.
 */

import { ICatalogoService } from '../contracts/ICatalogoService';
import { Departamento, Categoria, CatalogoResponse } from '../../models/catalogo.types';
import { MockCatalogoService } from '../mocks/MockCatalogoService';

export class CatalogoApiService implements ICatalogoService {
  private baseUrl: string;
  private mockFallback: MockCatalogoService;

  constructor(baseUrl: string = 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
    this.mockFallback = new MockCatalogoService();
  }

  async obtenerDepartamentos(): Promise<Departamento[]> {
    try {
      const response = await fetch(`${this.baseUrl}/catalogos/departamentos`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Error al consultar departamentos.');
      }

      const json = (await response.json()) as CatalogoResponse<Departamento>;
      return json.data || [];
    } catch (e) {
      console.warn('[CatalogoApiService] Fallback a mock para departamentos:', e);
      return await this.mockFallback.obtenerDepartamentos();
    }
  }

  async obtenerCategorias(idDepartamento?: number): Promise<Categoria[]> {
    try {
      const url =
        idDepartamento !== undefined && idDepartamento !== null
          ? `${this.baseUrl}/catalogos/categorias?idDepartamento=${idDepartamento}`
          : `${this.baseUrl}/catalogos/categorias`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Error al consultar categorías.');
      }

      const json = (await response.json()) as CatalogoResponse<Categoria>;
      return json.data || [];
    } catch (e) {
      console.warn('[CatalogoApiService] Fallback a mock para categorías:', e);
      return await this.mockFallback.obtenerCategorias(idDepartamento);
    }
  }
}
