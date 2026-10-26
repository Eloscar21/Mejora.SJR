/**
 * ICatalogoService.ts
 * Contrato abstracto para el servicio de catálogos oficiales de San Juan del Río (US-002 / US-004).
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Desacopla los ViewModels de la implementación de red.
 * - ISP (Interface Segregation Principle): Contiene exclusivamente la consulta de departamentos y categorías.
 */

import { Departamento, Categoria } from '../../models/catalogo.types';

export interface ICatalogoService {
  obtenerDepartamentos(): Promise<Departamento[]>;
  obtenerCategorias(idDepartamento?: number): Promise<Categoria[]>;
}
