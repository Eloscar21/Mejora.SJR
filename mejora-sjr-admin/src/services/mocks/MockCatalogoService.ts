/**
 * MockCatalogoService.ts
 * Implementación simulada (Mock) del servicio de catálogos para el Panel de Administración.
 * 
 * Principios arquitectónicos aplicados:
 * - LSP (Liskov Substitution Principle): Puede sustituir a cualquier implementación real de
 *   ICatalogoService sin alterar el comportamiento esperado del sistema.
 * - Desacoplamiento de Backend: Permite el desarrollo del Front-End sin depender de la
 *   disponibilidad de la base de datos o de los endpoints de la API.
 * - Fidelidad de Datos: Los datos semilla son idénticos a los definidos en database/schema.sql.
 */

import { ICatalogoService } from '../contracts/ICatalogoService';
import { Rol, Departamento, Estado, Categoria } from '../../models/catalogo.types';

export class MockCatalogoService implements ICatalogoService {
  private roles: Rol[] = [
    { idRol: 1, nombre: 'Ciudadano' },
    { idRol: 2, nombre: 'Trabajador' },
    { idRol: 3, nombre: 'Admin' },
    { idRol: 4, nombre: 'Superadmin' }
  ];

  private departamentos: Departamento[] = [
    { idDepartamento: 1, nombre: 'JAPAM' },
    { idDepartamento: 2, nombre: 'Servicios Públicos' }
  ];

  private estados: Estado[] = [
    { idEstado: 1, nombre: 'Recibido' },
    { idEstado: 2, nombre: 'En Revisión' },
    { idEstado: 3, nombre: 'En Progreso' },
    { idEstado: 4, nombre: 'Atendido' },
    { idEstado: 5, nombre: 'Rechazado' }
  ];

  private categorias: Categoria[] = [
    { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1 },
    { idCategoria: 2, nombre: 'Alcantarillado', idDepartamento: 1 },
    { idCategoria: 3, nombre: 'Alumbrado', idDepartamento: 2 },
    { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2 }
  ];

  // Simula latencia de red para validar estados de carga (Loading Skeletons)
  private simularLatencia<T>(data: T, delayMs: number = 300): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(data), delayMs));
  }

  async obtenerRoles(): Promise<Rol[]> {
    return this.simularLatencia([...this.roles]);
  }

  async obtenerDepartamentos(): Promise<Departamento[]> {
    return this.simularLatencia([...this.departamentos]);
  }

  async obtenerEstados(): Promise<Estado[]> {
    return this.simularLatencia([...this.estados]);
  }

  async obtenerCategorias(): Promise<Categoria[]> {
    return this.simularLatencia([...this.categorias]);
  }

  async obtenerCategoriasPorDepartamento(idDepartamento: number): Promise<Categoria[]> {
    const filtradas = this.categorias.filter(c => c.idDepartamento === idDepartamento);
    return this.simularLatencia(filtradas);
  }
}
