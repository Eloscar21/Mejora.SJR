import type { ActualizarEmpleadoDTO, CrearEmpleadoDTO, Empleado } from '../../models/empleado.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { IEmpleadoConsultaService } from '../contracts/IEmpleadoConsultaService';
import type { IEmpleadoGestionService } from '../contracts/IEmpleadoGestionService';
import { ApiError } from './ApiError';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function esId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Traduce y comprueba el contrato externo sin propagar campos adicionales. */
function normalizarEmpleado(value: unknown, status: number): Empleado {
  if (
    !esObjeto(value) || !esId(value.idUsuario) ||
    typeof value.nombre !== 'string' || typeof value.email !== 'string' ||
    (value.idRol !== 2 && value.idRol !== 3) ||
    (value.idDepartamento !== null && !esId(value.idDepartamento)) ||
    ![true, false, 0, 1].includes(value.activo as boolean | number) ||
    (value.rolNombre !== undefined && typeof value.rolNombre !== 'string') ||
    (value.departamentoNombre !== undefined && value.departamentoNombre !== null &&
      typeof value.departamentoNombre !== 'string')
  ) {
    throw new ApiError('El servidor devolvió datos de empleado no válidos.', status);
  }

  return {
    idUsuario: value.idUsuario,
    nombre: value.nombre,
    email: value.email,
    idRol: value.idRol,
    idDepartamento: value.idDepartamento,
    activo: value.activo === true || value.activo === 1,
    ...(typeof value.rolNombre === 'string' ? { rolNombre: value.rolNombre } : {}),
    ...(value.departamentoNombre !== undefined
      ? { departamentoNombre: value.departamentoNombre as string | null }
      : {}),
  };
}

/** La composición inyecta acceso al token; este adaptador no conoce cookies ni almacenamiento. */
export class EmpleadoApiService implements IEmpleadoConsultaService, IEmpleadoGestionService {
  private readonly baseUrl: string;

  constructor(
    private readonly sesion: Pick<IAuthService, 'obtenerToken'>,
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async listarEmpleados(): Promise<Empleado[]> {
    const { body, status } = await this.solicitar('', 'GET');
    if (!Array.isArray(body.data)) {
      throw new ApiError('El servidor devolvió una lista de empleados no válida.', status);
    }
    return body.data.map((item: unknown) => normalizarEmpleado(item, status));
  }

  async crearEmpleado(datos: CrearEmpleadoDTO): Promise<Empleado> {
    const { nombre, email, password, idRol, idDepartamento } = datos;
    const { body, status } = await this.solicitar('', 'POST', {
      nombre, email, password, idRol, idDepartamento,
    });
    return normalizarEmpleado(body.data, status);
  }

  async actualizarEmpleado(idUsuario: number, datos: ActualizarEmpleadoDTO): Promise<Empleado> {
    this.validarId(idUsuario);
    const { nombre, idRol, idDepartamento } = datos;
    const { body, status } = await this.solicitar(`/${idUsuario}`, 'PUT', {
      nombre, idRol, idDepartamento,
    });
    return normalizarEmpleado(body.data, status);
  }

  async desactivarEmpleado(idUsuario: number): Promise<void> {
    this.validarId(idUsuario);
    await this.solicitar(`/${idUsuario}`, 'PATCH');
  }

  private validarId(idUsuario: number): void {
    if (!esId(idUsuario)) throw new ApiError('El identificador del empleado no es válido.', null);
  }

  private async solicitar(path: string, method: string, datos?: object) {
    // Consultar el token en cada operación evita conservar una credencial anterior.
    const token = this.sesion.obtenerToken();
    if (!token) throw new ApiError('Inicia sesión para gestionar empleados.', null);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/empleados${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          ...(datos ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(datos ? { body: JSON.stringify(datos) } : {}),
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('No se pudo conectar con el servidor. Intenta de nuevo.', null);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('El servidor devolvió una respuesta no válida.', response.status);
    }

    if (!response.ok) {
      const message = esObjeto(body) && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : 'No se pudo completar la operación de empleados.';
      throw new ApiError(message, response.status);
    }
    if (!esObjeto(body) || body.success !== true) {
      throw new ApiError('El servidor no confirmó la operación de empleados.', response.status);
    }
    return { body, status: response.status };
  }
}
