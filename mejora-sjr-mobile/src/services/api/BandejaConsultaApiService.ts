/**
 * BandejaConsultaApiService.ts
 * Servicio HTTP para la consulta de órdenes de trabajo asignadas a cuadrillas de campo (US-033 / US-025).
 * Consume GET /api/incidencias?soloAsignadasAMi=true con autenticación Bearer JWT.
 */

import type { Incidencia } from '../../models/incidencia.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { IBandejaConsultaService } from '../contracts/IBandejaConsultaService';
import { getApiBaseUrl } from './apiConfig';

interface IncidenciaBackendRaw {
  idIncidencia?: number;
  IdIncidencia?: number;
  descripcion?: string;
  Descripcion?: string;
  latitud?: number;
  Latitud?: number;
  longitud?: number;
  Longitud?: number;
  idEstado?: number;
  IdEstado?: number;
  estadoNombre?: string;
  Estado?: string;
  idCategoria?: number;
  IdCategoria?: number;
  categoriaNombre?: string;
  Categoria?: string;
  idDepartamento?: number;
  IdDepartamento?: number;
  departamentoNombre?: string;
  Departamento?: string;
  idTrabajadorAsignado?: number | null;
  IdTrabajadorAsignado?: number | null;
  trabajadorNombre?: string | null;
  TrabajadorNombre?: string | null;
  idCiudadano?: number;
  IdCiudadano?: number;
  ciudadanoNombre?: string;
  CiudadanoNombre?: string;
  fechaCreacion?: string;
  FechaCreacion?: string;
  fechaActualizacion?: string;
  FechaActualizacion?: string;
  fotoInicialUrl?: string;
  FotoInicialUrl?: string;
}

function formatearFecha(fechaRaw: string | undefined): string {
  if (!fechaRaw) return 'Reciente';
  try {
    const d = new Date(fechaRaw);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const anio = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${anio} · ${hora}:${min}`;
    }
  } catch {
    // fallback
  }
  return String(fechaRaw);
}

export class BandejaConsultaApiService implements IBandejaConsultaService {
  public readonly esMock = false;
  private readonly baseUrl: string;

  constructor(
    private readonly sesion: Pick<IAuthService, 'obtenerToken'>,
    baseUrl: string = getApiBaseUrl(),
    private readonly fetchImpl: typeof fetch = fetch
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async listarAsignadas(idTrabajador: number): Promise<Incidencia[]> {
    if (!Number.isSafeInteger(idTrabajador) || idTrabajador <= 0) {
      throw new Error('Se requiere un identificador de trabajador válido.');
    }

    const token = await this.sesion.obtenerToken();
    if (!token?.trim()) {
      throw new Error('Inicia sesión para consultar tus órdenes de trabajo.');
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/incidencias?soloAsignadasAMi=true`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new Error('No fue posible conectar con el servidor municipal. Verifica tu conexión de red.');
    }

    if (!response.ok) {
      throw new Error(`Error ${response.status}: No fue posible consultar tus asignaciones.`);
    }

    const json = (await response.json()) as { success?: boolean; data?: IncidenciaBackendRaw[] };
    if (!Array.isArray(json?.data)) {
      return [];
    }

    return json.data.map((item) => {
      const idIncidencia = Number(item.idIncidencia ?? item.IdIncidencia);
      const idCat = Number(item.idCategoria ?? item.IdCategoria ?? 1);
      const idDep = Number(item.idDepartamento ?? item.IdDepartamento ?? (idCat === 1 || idCat === 2 ? 1 : 2));
      const idEst = Number(item.idEstado ?? item.IdEstado ?? 1);
      const idTrab = item.idTrabajadorAsignado ?? item.IdTrabajadorAsignado;
      const idCiudadano = item.idCiudadano ?? item.IdCiudadano ?? 0;

      return {
        idIncidencia,
        descripcion: String(item.descripcion ?? item.Descripcion ?? '').trim(),
        latitud: Number(item.latitud ?? item.Latitud ?? 20.3889),
        longitud: Number(item.longitud ?? item.Longitud ?? -99.9961),
        idCategoria: idCat,
        categoriaNombre: String(item.categoriaNombre ?? item.Categoria ?? 'General').trim(),
        idDepartamento: idDep,
        departamentoNombre: String(
          item.departamentoNombre ?? item.Departamento ?? (idDep === 1 ? 'JAPAM' : 'Servicios Públicos')
        ).trim(),
        idEstado: idEst,
        estadoNombre: String(item.estadoNombre ?? item.Estado ?? 'Recibido').trim(),
        idUsuario: Number(idCiudadano),
        ciudadanoNombre: String(item.ciudadanoNombre ?? item.CiudadanoNombre ?? 'Ciudadano SJR').trim(),
        idTrabajadorAsignado: idTrab !== null && idTrab !== undefined ? Number(idTrab) : null,
        trabajadorNombre: item.trabajadorNombre ?? item.TrabajadorNombre ?? null,
        fechaCreacion: formatearFecha(item.fechaCreacion ?? item.FechaCreacion),
        fechaActualizacion: item.fechaActualizacion ? String(item.fechaActualizacion) : undefined,
        fotoInicialUrl: item.fotoInicialUrl ?? item.FotoInicialUrl ?? undefined,
        direccionReferencia: 'San Juan del Río, Qro.',
      };
    });
  }

  async actualizarEstado(idIncidencia: number, nuevoEstado: number): Promise<Incidencia> {
    if (!Number.isSafeInteger(idIncidencia) || idIncidencia <= 0) {
      throw new Error('Identificador de incidencia no válido.');
    }
    if (!Number.isSafeInteger(nuevoEstado) || nuevoEstado <= 0) {
      throw new Error('Estado no válido.');
    }

    const token = await this.sesion.obtenerToken();
    if (!token?.trim()) {
      throw new Error('Inicia sesión para actualizar la orden de trabajo.');
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/incidencias/${idIncidencia}/estado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ idEstado: nuevoEstado }),
      });
    } catch {
      throw new Error('No fue posible conectar con el servidor municipal para actualizar el estado.');
    }

    if (!response.ok) {
      let errorMsg = `Error ${response.status}: No fue posible actualizar la orden.`;
      try {
        const errorJson = (await response.json()) as { message?: string };
        if (errorJson && typeof errorJson.message === 'string') {
          errorMsg = errorJson.message;
        }
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    const json = (await response.json()) as { success?: boolean; data?: IncidenciaBackendRaw };
    const raw = json.data || {};
    return {
      idIncidencia,
      descripcion: String(raw.descripcion ?? raw.Descripcion ?? ''),
      latitud: Number(raw.latitud ?? raw.Latitud ?? 20.3889),
      longitud: Number(raw.longitud ?? raw.Longitud ?? -99.9961),
      idCategoria: Number(raw.idCategoria ?? raw.IdCategoria ?? 1),
      idDepartamento: Number(raw.idDepartamento ?? raw.IdDepartamento ?? 1),
      idEstado: nuevoEstado,
      estadoNombre: String(raw.estadoNombre ?? raw.Estado ?? 'Actualizado'),
      idUsuario: Number(raw.idCiudadano ?? raw.IdCiudadano ?? 0),
      ciudadanoNombre: String(raw.ciudadanoNombre ?? raw.CiudadanoNombre ?? 'Ciudadano'),
      idTrabajadorAsignado: raw.idTrabajadorAsignado ? Number(raw.idTrabajadorAsignado) : null,
      fechaCreacion: formatearFecha(raw.fechaCreacion ?? raw.FechaCreacion),
    };
  }
}
