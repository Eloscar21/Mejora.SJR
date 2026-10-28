import type { Departamento } from '../../models/catalogo.types';
import type { IDepartamentoConsultaService } from '../contracts/IDepartamentoConsultaService';
import { ApiError } from './ApiError';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Adaptador del catálogo público de departamentos de US-002. */
export class DepartamentoApiService implements IDepartamentoConsultaService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async obtenerDepartamentos(): Promise<Departamento[]> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/catalogos/departamentos`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('No se pudieron consultar los departamentos. Revisa la conexión.', null);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('El servidor devolvió una respuesta de departamentos no válida.', response.status);
    }

    if (!response.ok) {
      const message = esObjeto(body) && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : 'No se pudieron cargar los departamentos.';
      throw new ApiError(message, response.status);
    }
    if (!esObjeto(body) || body.success !== true || !Array.isArray(body.data)) {
      throw new ApiError('El servidor devolvió un catálogo de departamentos no válido.', response.status);
    }

    return body.data.map((item: unknown) => {
      if (
        !esObjeto(item) || typeof item.idDepartamento !== 'number' ||
        !Number.isSafeInteger(item.idDepartamento) || item.idDepartamento <= 0 ||
        typeof item.nombre !== 'string' || !item.nombre.trim()
      ) {
        throw new ApiError('El servidor devolvió un departamento no válido.', response.status);
      }
      return { idDepartamento: item.idDepartamento, nombre: item.nombre };
    });
  }
}
