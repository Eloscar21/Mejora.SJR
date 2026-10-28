import type { Empleado } from '../../models/empleado.types';

/** Consulta que requiere la tabla de US-009, separada de las mutaciones. */
export interface IEmpleadoConsultaService {
  listarEmpleados(): Promise<Empleado[]>;
}
