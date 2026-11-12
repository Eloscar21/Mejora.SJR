import type { EvidenciaInicialReporte, NuevaIncidenciaDTO, ReporteCreado } from '../../models/incidencia.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { IReporteSubmissionService } from '../contracts/IReporteSubmissionService';
import { getApiBaseUrl } from './apiConfig';
import { ReporteApiError } from './ReporteApiError';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function esId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function esFecha(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function esFotoUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\/[^\s"]+$/.test(value);
}

function respuestaInvalida(status: number): ReporteApiError {
  return new ReporteApiError('No se pudo confirmar el reporte: el servidor devolvió datos no válidos.', status, true);
}

function normalizarReporte(value: unknown, status: number): ReporteCreado {
  if (
    !esObjeto(value) || !esId(value.idIncidencia) || !esId(value.idUsuario) || !esId(value.idCategoria) ||
    typeof value.descripcion !== 'string' || !value.descripcion.trim() || value.idEstado !== 1 ||
    typeof value.latitud !== 'number' || !Number.isFinite(value.latitud) || Math.abs(value.latitud) > 90 ||
    typeof value.longitud !== 'number' || !Number.isFinite(value.longitud) || Math.abs(value.longitud) > 180 ||
    !esFecha(value.fechaCreacion) || !Array.isArray(value.evidencias)
  ) {
    throw respuestaInvalida(status);
  }

  const evidencias: EvidenciaInicialReporte[] = value.evidencias.map((evidencia: unknown) => {
    if (
      !esObjeto(evidencia) || !esId(evidencia.idEvidencia) || !esId(evidencia.idIncidencia) ||
      evidencia.idIncidencia !== value.idIncidencia ||
      evidencia.tipoEvidencia !== 'INICIAL' || !esFotoUrl(evidencia.fotoUrl) || !esFecha(evidencia.fechaSubida)
    ) {
      throw respuestaInvalida(status);
    }
    return {
      idEvidencia: evidencia.idEvidencia,
      idIncidencia: evidencia.idIncidencia,
      tipoEvidencia: evidencia.tipoEvidencia,
      fotoUrl: evidencia.fotoUrl,
      fechaSubida: evidencia.fechaSubida,
    };
  });

  return {
    idIncidencia: value.idIncidencia,
    descripcion: value.descripcion,
    latitud: value.latitud,
    longitud: value.longitud,
    idUsuario: value.idUsuario,
    idCategoria: value.idCategoria,
    idEstado: value.idEstado,
    fechaCreacion: value.fechaCreacion,
    evidencias,
  };
}

/** Adaptador de US-023. Recibe sesión y transporte; no almacena ni inventa reportes. */
export class ReporteApiService implements IReporteSubmissionService {
  private readonly baseUrl: string;

  constructor(
    private readonly sesion: Pick<IAuthService, 'obtenerToken'>,
    baseUrl: string = getApiBaseUrl(),
    private readonly solicitar: typeof fetch = fetch,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async crearReporte(datos: NuevaIncidenciaDTO): Promise<ReporteCreado> {
    const token = await this.sesion.obtenerToken();
    if (!token?.trim()) {
      throw new ReporteApiError('Inicia sesión para enviar el reporte.', 401);
    }

    const { descripcion, idCategoria, latitud, longitud, fotoUrl } = datos;
    let response: Response;
    try {
      response = await this.solicitar(`${this.baseUrl}/incidencias`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ descripcion, idCategoria, latitud, longitud, fotoUrl }),
      });
    } catch {
      throw new ReporteApiError('No se pudo confirmar el guardado del reporte. Verifica la conexión.', null, true);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ReporteApiError(
        'El servidor devolvió una respuesta que no se pudo interpretar.',
        response.status,
        response.ok || response.status >= 500 || response.status === 408,
      );
    }

    if (!response.ok) {
      const mensaje = esObjeto(body) && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : 'No se pudo guardar el reporte.';
      throw new ReporteApiError(mensaje, response.status, response.status >= 500 || response.status === 408);
    }

    if (response.status !== 201 || !esObjeto(body) || body.success !== true) {
      throw respuestaInvalida(response.status);
    }

    const reporte = normalizarReporte(body.data, response.status);
    if (
      reporte.idCategoria !== idCategoria ||
      (fotoUrl && !reporte.evidencias.some(evidencia => evidencia.fotoUrl === fotoUrl.trim()))
    ) {
      throw respuestaInvalida(response.status);
    }
    return reporte;
  }
}
