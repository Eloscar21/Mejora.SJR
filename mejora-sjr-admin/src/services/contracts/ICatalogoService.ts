/**
 * ICatalogoService.ts
 * Contrato formal para el servicio de catálogos municipales.
 * 
 * Principios arquitectónicos aplicados:
 * - ISP (Interface Segregation Principle): Métodos específicos para obtención asíncrona de catálogos.
 * - DIP (Dependency Inversion Principle): Los ViewModels dependerán de esta abstracción,
 *   nunca de implementaciones concretas como Axios o Fetch directo.
 */

import { Rol, Departamento, Estado, Categoria } from '../../models/catalogo.types';

export interface ICatalogoService {
  obtenerRoles(): Promise<Rol[]>;
  obtenerDepartamentos(): Promise<Departamento[]>;
  obtenerEstados(): Promise<Estado[]>;
  obtenerCategorias(): Promise<Categoria[]>;
  obtenerCategoriasPorDepartamento(idDepartamento: number): Promise<Categoria[]>;
}
