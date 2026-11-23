/**
 * CatalogoApiService.ts
 * Implementación HTTP real para consulta en tiempo real de catálogos municipales (US-002 / US-004 / US-035).
 *
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Implementa ICatalogoService.
 * - LSP (Liskov Substitution Principle): Intercambiable con MockCatalogoService.
 */

import { ICatalogoService } from '../contracts/ICatalogoService';
import { Departamento, Categoria, CatalogoResponse } from '../../models/catalogo.types';
import { getApiBaseUrl } from './apiConfig';

export class CatalogoApiService implements ICatalogoService {
  private baseUrl: string;
  private fetchImpl: typeof fetch;

  constructor(baseUrl: string = getApiBaseUrl(), fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
  }

  async obtenerDepartamentos(): Promise<Departamento[]> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/catalogos/departamentos`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
    } catch {
      throw new Error('No se pudieron cargar los departamentos. Verifica la conexión con el servidor.');
    }

    if (!response.ok) {
      throw new Error('Error al consultar departamentos.');
    }

    const json = (await response.json()) as CatalogoResponse<Departamento>;
    const lista = Array.isArray(json?.data) ? json.data : [];
    return lista.map((d) => ({
      idDepartamento: Number(d.idDepartamento),
      nombre: String(d.nombre).trim(),
    }));
  }

  async obtenerCategorias(idDepartamento?: number): Promise<Categoria[]> {
    const url =
      idDepartamento !== undefined && idDepartamento !== null
        ? `${this.baseUrl}/catalogos/categorias?idDepartamento=${idDepartamento}`
        : `${this.baseUrl}/catalogos/categorias`;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
    } catch {
      throw new Error('No se pudieron cargar las categorías. Verifica la conexión con el servidor.');
    }

    if (!response.ok) {
      throw new Error('Error al consultar categorías.');
    }

    const json = (await response.json()) as CatalogoResponse<Categoria>;
    const lista = Array.isArray(json?.data) ? json.data : [];
    return lista.map((c) => ({
      idCategoria: Number(c.idCategoria),
      nombre: String(c.nombre).trim(),
      idDepartamento: Number(c.idDepartamento),
      departamentoNombre: c.departamentoNombre
        ? String(c.departamentoNombre).trim()
        : Number(c.idDepartamento) === 1
          ? 'JAPAM'
          : 'Servicios Públicos',
    }));
  }
}
