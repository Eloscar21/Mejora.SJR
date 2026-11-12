/**
 * IncidenciaApiService.ts
 * Adaptador HTTP para la gestión administrativa de Incidencias Ciudadanas (US-026 / US-025).
 * Consume GET /api/incidencias, PATCH /api/incidencias/:id/asignar y PATCH /api/incidencias/:id/descartar.
 */

import {
  ESTADOS_INCIDENCIA,
  type EstadoIncidenciaId,
  type FiltrosIncidencias,
  type Incidencia,
} from '../../models/incidencia.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { IIncidenciaService } from '../contracts/IIncidenciaService';
import { MockIncidenciaService } from '../mocks/MockIncidenciaService';
import { ApiError } from './ApiError';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extraerMotivoRechazo(descripcion: string, motivoExplicito?: unknown): string | null {
  if (typeof motivoExplicito === 'string' && motivoExplicito.trim()) {
    return motivoExplicito.trim();
  }
  const match = descripcion.match(/\[RECHAZADO:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

export function normalizarIncidencia(raw: unknown): Incidencia {
  if (!esObjeto(raw)) {
    throw new ApiError('El servidor devolvió un registro de incidencia inválido.', null);
  }

  const idIncidencia = Number(raw.idIncidencia ?? raw.IdIncidencia);
  const idCategoria = Number(raw.idCategoria ?? raw.IdCategoria ?? 1);
  const idDepartamento = Number(
    raw.idDepartamento ?? raw.IdDepartamento ?? (idCategoria === 1 || idCategoria === 2 ? 1 : 2)
  );
  const idEstadoRaw = Number(raw.idEstado ?? raw.IdEstado ?? 1);
  const idEstado = ([1, 2, 3, 4, 5].includes(idEstadoRaw) ? idEstadoRaw : 1) as EstadoIncidenciaId;
  const descripcion = String(raw.descripcion ?? raw.Descripcion ?? '').trim();

  const categoriaPorDefecto =
    idCategoria === 1
      ? 'Fugas de agua'
      : idCategoria === 2
        ? 'Alcantarillado'
        : idCategoria === 3
          ? 'Alumbrado'
          : 'Bacheo';

  const departamentoPorDefecto = idDepartamento === 1 ? 'JAPAM' : 'Servicios Públicos';

  const idTrabajadorRaw = raw.idTrabajadorAsignado ?? raw.IdTrabajadorAsignado;
  const idTrabajadorAsignado =
    idTrabajadorRaw !== null && idTrabajadorRaw !== undefined && Number(idTrabajadorRaw) > 0
      ? Number(idTrabajadorRaw)
      : null;

  return {
    idIncidencia,
    descripcion,
    latitud: Number(raw.latitud ?? raw.Latitud ?? 20.3888),
    longitud: Number(raw.longitud ?? raw.Longitud ?? -99.9958),
    fechaCreacion: String(raw.fechaCreacion ?? raw.FechaCreacion ?? new Date().toISOString()),
    fechaActualizacion: raw.fechaActualizacion
      ? String(raw.fechaActualizacion)
      : raw.FechaActualizacion
        ? String(raw.FechaActualizacion)
        : undefined,
    idEstado,
    estadoNombre:
      typeof raw.estadoNombre === 'string' && raw.estadoNombre.trim()
        ? raw.estadoNombre.trim()
        : ESTADOS_INCIDENCIA[idEstado].nombre,
    idCategoria,
    categoriaNombre:
      typeof raw.categoriaNombre === 'string' && raw.categoriaNombre.trim()
        ? raw.categoriaNombre.trim()
        : categoriaPorDefecto,
    idDepartamento,
    departamentoNombre:
      typeof raw.departamentoNombre === 'string' && raw.departamentoNombre.trim()
        ? raw.departamentoNombre.trim()
        : departamentoPorDefecto,
    idCiudadano:
      raw.idCiudadano !== undefined && raw.idCiudadano !== null
        ? Number(raw.idCiudadano)
        : raw.idUsuario !== undefined && raw.idUsuario !== null
          ? Number(raw.idUsuario)
          : undefined,
    ciudadanoNombre:
      typeof raw.ciudadanoNombre === 'string' && raw.ciudadanoNombre.trim()
        ? raw.ciudadanoNombre.trim()
        : 'Ciudadano SJR',
    idTrabajadorAsignado,
    trabajadorNombre:
      typeof raw.trabajadorNombre === 'string' && raw.trabajadorNombre.trim()
        ? raw.trabajadorNombre.trim()
        : null,
    fotoInicialUrl:
      typeof raw.fotoInicialUrl === 'string' && raw.fotoInicialUrl.trim()
        ? raw.fotoInicialUrl.trim()
        : null,
    fotoResolucionUrl:
      typeof raw.fotoResolucionUrl === 'string' && raw.fotoResolucionUrl.trim()
        ? raw.fotoResolucionUrl.trim()
        : null,
    motivoRechazo: extraerMotivoRechazo(descripcion, raw.motivoRechazo),
  };
}

export class IncidenciaApiService implements IIncidenciaService {
  private readonly baseUrl: string;
  private readonly fallbackService: MockIncidenciaService;

  constructor(
    private readonly sesion: Pick<IAuthService, 'obtenerToken'>,
    baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
    fallbackService: MockIncidenciaService = new MockIncidenciaService()
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fallbackService = fallbackService;
  }

  private obtenerHeaders(conJson = false): Record<string, string> {
    const token = this.sesion.obtenerToken();
    if (!token) {
      throw new ApiError('No hay sesión activa. Inicia sesión nuevamente.', 401);
    }
    return {
      Accept: 'application/json',
      ...(conJson ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    };
  }

  async listarIncidencias(filtros?: FiltrosIncidencias): Promise<Incidencia[]> {
    const params = new URLSearchParams();
    if (filtros?.idDepartamento !== undefined && filtros.idDepartamento !== null) {
      params.set('idDepartamento', String(filtros.idDepartamento));
    }
    if (filtros?.idEstado !== undefined && filtros.idEstado !== null) {
      params.set('idEstado', String(filtros.idEstado));
    }
    if (filtros?.idTrabajadorAsignado !== undefined && filtros.idTrabajadorAsignado !== null) {
      params.set('idTrabajadorAsignado', String(filtros.idTrabajadorAsignado));
    }

    const queryString = params.toString();
    const url = `${this.baseUrl}/incidencias${queryString ? `?${queryString}` : ''}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.obtenerHeaders(false),
        cache: 'no-store',
      });
    } catch {
      return this.fallbackService.listarIncidencias(filtros);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('El servidor devolvió una respuesta de incidencias no válida.', response.status);
    }

    if (!response.ok) {
      const message =
        esObjeto(body) && typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'Error al consultar la bandeja de incidencias.';
      throw new ApiError(message, response.status);
    }

    if (!esObjeto(body) || body.success !== true || !Array.isArray(body.data)) {
      throw new ApiError('El formato del listado de incidencias no es válido.', response.status);
    }

    return body.data.map(normalizarIncidencia);
  }

  async asignarTrabajador(idIncidencia: number, idTrabajador: number): Promise<Incidencia> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/incidencias/${idIncidencia}/asignar`, {
        method: 'PATCH',
        headers: this.obtenerHeaders(true),
        body: JSON.stringify({ idTrabajador: Number(idTrabajador) }),
      });
    } catch {
      return this.fallbackService.asignarTrabajador(idIncidencia, idTrabajador);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('Respuesta inválida al asignar trabajador.', response.status);
    }

    if (!response.ok) {
      const message =
        esObjeto(body) && typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'No se pudo asignar el trabajador a la incidencia.';
      throw new ApiError(message, response.status);
    }

    if (!esObjeto(body) || body.success !== true || !esObjeto(body.data)) {
      throw new ApiError('Respuesta de asignación incompleta.', response.status);
    }

    return normalizarIncidencia(body.data);
  }

  async descartarIncidencia(idIncidencia: number, motivoRechazo: string): Promise<Incidencia> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/incidencias/${idIncidencia}/descartar`, {
        method: 'PATCH',
        headers: this.obtenerHeaders(true),
        body: JSON.stringify({ motivoRechazo: motivoRechazo.trim() }),
      });
    } catch {
      return this.fallbackService.descartarIncidencia(idIncidencia, motivoRechazo);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError('Respuesta inválida al descartar la incidencia.', response.status);
    }

    if (!response.ok) {
      const message =
        esObjeto(body) && typeof body.message === 'string' && body.message.trim()
          ? body.message
          : 'No se pudo descartar la incidencia.';
      throw new ApiError(message, response.status);
    }

    if (!esObjeto(body) || body.success !== true || !esObjeto(body.data)) {
      throw new ApiError('Respuesta de descarte incompleta.', response.status);
    }

    return normalizarIncidencia(body.data);
  }
}
