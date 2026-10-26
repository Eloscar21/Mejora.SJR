/**
 * MockCatalogoService.ts
 * Implementación simulada de catálogos oficiales de San Juan del Río (US-002 / US-004).
 * 
 * Principios aplicados:
 * - LSP (Liskov Substitution Principle): Intercambiable con CatalogoApiService.
 * - Desacoplamiento total de red para pruebas offline y simulador móvil.
 */

import { ICatalogoService } from '../contracts/ICatalogoService';
import { Departamento, Categoria } from '../../models/catalogo.types';

export class MockCatalogoService implements ICatalogoService {
  private departamentos: Departamento[] = [
    { idDepartamento: 1, nombre: 'JAPAM' },
    { idDepartamento: 2, nombre: 'Servicios Públicos' },
  ];

  private categorias: Categoria[] = [
    {
      idCategoria: 1,
      nombre: 'Fugas de agua',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
    },
    {
      idCategoria: 2,
      nombre: 'Alcantarillado',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
    },
    {
      idCategoria: 3,
      nombre: 'Alumbrado',
      idDepartamento: 2,
      departamentoNombre: 'Servicios Públicos',
    },
    {
      idCategoria: 4,
      nombre: 'Bacheo',
      idDepartamento: 2,
      departamentoNombre: 'Servicios Públicos',
    },
  ];

  async obtenerDepartamentos(): Promise<Departamento[]> {
    await new Promise((r) => setTimeout(r, 300)); // Latencia simulada
    return [...this.departamentos];
  }

  async obtenerCategorias(idDepartamento?: number): Promise<Categoria[]> {
    await new Promise((r) => setTimeout(r, 300));
    if (idDepartamento !== undefined && idDepartamento !== null) {
      return this.categorias.filter((c) => c.idDepartamento === idDepartamento);
    }
    return [...this.categorias];
  }
}
