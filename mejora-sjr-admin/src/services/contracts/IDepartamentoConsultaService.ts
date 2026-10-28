import type { Departamento } from '../../models/catalogo.types';

/** El formulario necesita departamentos; no depende del catálogo de categorías. */
export interface IDepartamentoConsultaService {
  obtenerDepartamentos(): Promise<Departamento[]>;
}
