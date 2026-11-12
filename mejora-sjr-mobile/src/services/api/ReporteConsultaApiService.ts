import type { ReporteCiudadano } from '../../models/reporteCiudadano.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { IReporteConsultaService } from '../contracts/IReporteConsultaService';
import { getApiBaseUrl } from './apiConfig';
import { ReporteApiError } from './ReporteApiError';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function esId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function invalida(status: number): ReporteApiError {
  return new ReporteApiError('El servidor devolvió una lista de reportes no válida.', status);
}
function normalizar(value: unknown, status: number): ReporteCiudadano {
  if (!esObjeto(value)) throw invalida(status);
  const idUsuario = value.idUsuario ?? value.idCiudadano;
  if (
    !esId(value.idIncidencia) || !esId(idUsuario) || !esId(value.idCategoria) || !esId(value.idEstado) ||
    (value.idUsuario !== undefined && value.idCiudadano !== undefined && value.idUsuario !== value.idCiudadano) ||
    typeof value.descripcion !== 'string' || !value.descripcion.trim() ||
    typeof value.latitud !== 'number' || !Number.isFinite(value.latitud) || Math.abs(value.latitud) > 90 ||
    typeof value.longitud !== 'number' || !Number.isFinite(value.longitud) || Math.abs(value.longitud) > 180 ||
    typeof value.fechaCreacion !== 'string' || !Number.isFinite(Date.parse(value.fechaCreacion)) ||
    (value.categoriaNombre != null && typeof value.categoriaNombre !== 'string') ||
    (value.estadoNombre != null && typeof value.estadoNombre !== 'string') ||
    (value.fotoInicialUrl != null && (typeof value.fotoInicialUrl !== 'string' || !/^https?:\/\/[^\s"]+$/.test(value.fotoInicialUrl)))
  ) throw invalida(status);
  return {
    idIncidencia: value.idIncidencia,
    idUsuario,
    descripcion: value.descripcion,
    idCategoria: value.idCategoria,
    ...(typeof value.categoriaNombre === 'string' ? { categoriaNombre: value.categoriaNombre } : {}),
    latitud: value.latitud,
    longitud: value.longitud,
    idEstado: value.idEstado,
    ...(typeof value.estadoNombre === 'string' ? { estadoNombre: value.estadoNombre } : {}),
    fechaCreacion: value.fechaCreacion,
    fotoInicialUrl: typeof value.fotoInicialUrl === 'string' ? value.fotoInicialUrl : null,
  };
}

/** Consulta privada con JWT actual; no utiliza el listado administrativo ni hace fallback a mocks. */
export class ReporteConsultaApiService implements IReporteConsultaService {
  private readonly baseUrl: string;
  constructor(
    private readonly sesion: Pick<IAuthService, 'obtenerToken'>,
    baseUrl: string = getApiBaseUrl(),
    private readonly solicitar: typeof fetch = fetch,
  ) { this.baseUrl = baseUrl.replace(/\/+$/, ''); }

  async listarMisReportes(): Promise<ReporteCiudadano[]> {
    const token = await this.sesion.obtenerToken();
    if (!token?.trim()) throw new ReporteApiError('Inicia sesión para consultar tus reportes.', 401);
    let response: Response;
    try {
      response = await this.solicitar(this.baseUrl + '/incidencias/mis-reportes', {
        method: 'GET', headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
      });
    } catch { throw new ReporteApiError('No se pudieron consultar tus reportes. Verifica la conexión.', null); }
    let body: unknown;
    try { body = await response.json(); } catch { throw invalida(response.status); }
    if (!response.ok) {
      const message = esObjeto(body) && typeof body.message === 'string' && body.message.trim()
        ? body.message : 'No se pudieron consultar tus reportes.';
      throw new ReporteApiError(message, response.status);
    }
    if (!esObjeto(body) || body.success !== true || !Array.isArray(body.data)) throw invalida(response.status);
    return body.data.map(item => normalizar(item, response.status));
  }
}
