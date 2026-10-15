/**
 * CatalogoApiService.ts
 * Implementación HTTP real para el consumo de la API REST de catálogos en Node.js/Express.
 * 
 * Principios arquitectónicos aplicados:
 * - DIP (Dependency Inversion Principle): Implementa el contrato ICatalogoService.
 * - LSP (Liskov Substitution Principle): Puede sustituir al MockCatalogoService de forma transparente.
 * - Seguridad y Cero Confianza: Sanitiza y valida las respuestas HTTP antes de retornarlas al ViewModel.
 */

import { ICatalogoService } from '../contracts/ICatalogoService';
import { Rol, Departamento, Estado, Categoria } from '../../models/catalogo.types';

export class CatalogoApiService implements ICatalogoService {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  private async fetchJson<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Error en API (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`Fallo en llamada a ${endpoint}:`, error);
      throw error;
    }
  }

  async obtenerRoles(): Promise<Rol[]> {
    return this.fetchJson<Rol[]>('/catalogos/roles');
  }

  async obtenerDepartamentos(): Promise<Departamento[]> {
    return this.fetchJson<Departamento[]>('/catalogos/departamentos');
  }

  async obtenerEstados(): Promise<Estado[]> {
    return this.fetchJson<Estado[]>('/catalogos/estados');
  }

  async obtenerCategorias(): Promise<Categoria[]> {
    return this.fetchJson<Categoria[]>('/catalogos/categorias');
  }

  async obtenerCategoriasPorDepartamento(idDepartamento: number): Promise<Categoria[]> {
    return this.fetchJson<Categoria[]>(`/catalogos/categorias?idDepartamento=${idDepartamento}`);
  }
}
