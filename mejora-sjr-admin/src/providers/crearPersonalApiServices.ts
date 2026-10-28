import { DepartamentoApiService } from '../services/api/DepartamentoApiService';
import { EmpleadoApiService } from '../services/api/EmpleadoApiService';
import type { IAuthService } from '../services/contracts/IAuthService';
import type { IPersonalServices } from '../services/contracts/IPersonalServices';

/** Ejecutar una vez en la composición superior, conservando las instancias. */
export function crearPersonalApiServices(
  sesion: Pick<IAuthService, 'obtenerToken'>,
  baseUrl?: string
): IPersonalServices {
  const empleados = new EmpleadoApiService(sesion, baseUrl);
  return {
    consulta: empleados,
    gestion: empleados,
    departamentos: new DepartamentoApiService(baseUrl),
  };
}
