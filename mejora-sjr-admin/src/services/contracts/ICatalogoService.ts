/**
 * ICatalogoService.ts
 * Contrato de servicio para la consulta y administración de Catálogos Municipales (US-027 / US-002).
 * Cumple con el Principio de Inversión de Dependencias (DIP).
 */

import type {
  CategoriaReporte,
  Departamento,
  GuardarCategoriaPayload,
  GuardarDepartamentoPayload,
} from '../../models/catalogo.types';

export interface ICatalogoService {
  /** Obtiene las dependencias / secretarías municipales registradas. */
  obtenerDepartamentos(): Promise<Departamento[]>;

  /** Obtiene las categorías de reportes ciudadanos, opcionalmente filtradas por secretaría. */
  obtenerCategorias(idDepartamento?: number | null): Promise<CategoriaReporte[]>;

  /** Crea una nueva dependencia municipal en el catálogo. */
  crearDepartamento(payload: GuardarDepartamentoPayload): Promise<Departamento>;

  /** Actualiza los datos de una dependencia municipal existente. */
  actualizarDepartamento(
    idDepartamento: number,
    payload: GuardarDepartamentoPayload
  ): Promise<Departamento>;

  /** Crea una nueva categoría de reporte asociada a una secretaría. */
  crearCategoria(payload: GuardarCategoriaPayload): Promise<CategoriaReporte>;

  /** Actualiza una categoría de reporte existente. */
  actualizarCategoria(
    idCategoria: number,
    payload: GuardarCategoriaPayload
  ): Promise<CategoriaReporte>;

  /** Activa o desactiva lógicamente una categoría de reporte. */
  cambiarEstadoCategoria(idCategoria: number, activo: boolean): Promise<CategoriaReporte>;
}

