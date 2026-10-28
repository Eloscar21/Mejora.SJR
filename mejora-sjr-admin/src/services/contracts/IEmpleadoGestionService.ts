import type {
  ActualizarEmpleadoDTO,
  CrearEmpleadoDTO,
  Empleado,
} from '../../models/empleado.types';

/** Operaciones de los formularios US-010 y US-011; los fallos rechazan la promesa. */
export interface IEmpleadoGestionService {
  crearEmpleado(datos: CrearEmpleadoDTO): Promise<Empleado>;
  actualizarEmpleado(idUsuario: number, datos: ActualizarEmpleadoDTO): Promise<Empleado>;
  desactivarEmpleado(idUsuario: number): Promise<void>;
}
