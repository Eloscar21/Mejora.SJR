/**
 * MockIncidenciaService.ts
 * Implementación en memoria de IIncidenciaService para pruebas unitarias y desarrollo local (US-026).
 * Cumple con el Principio de Sustitución de Liskov (LSP).
 */

import { ESTADOS_INCIDENCIA, type FiltrosIncidencias, type Incidencia } from '../../models/incidencia.types';
import type { IIncidenciaService } from '../contracts/IIncidenciaService';

const INCIDENCIAS_SEMILLA: Incidencia[] = [
  {
    idIncidencia: 101,
    descripcion: 'Fuga de agua potable severa sobre Av. Juárez esquina con Hidalgo, frente a la plaza principal.',
    latitud: 20.3888,
    longitud: -99.9958,
    fechaCreacion: '2026-11-10T09:15:00.000Z',
    fechaActualizacion: '2026-11-10T09:15:00.000Z',
    idEstado: 1,
    estadoNombre: 'Recibido',
    idCategoria: 1,
    categoriaNombre: 'Fugas de agua',
    idDepartamento: 1,
    departamentoNombre: 'JAPAM',
    idCiudadano: 1,
    ciudadanoNombre: 'Juan Ciudadano',
    idTrabajadorAsignado: null,
    trabajadorNombre: null,
    fotoInicialUrl: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?auto=format&fit=crop&w=600&q=80',
    fotoResolucionUrl: null,
    motivoRechazo: null,
  },
  {
    idIncidencia: 102,
    descripcion: 'Luminaria pública fundida en calle Pino Suárez #42, Colonia Centro; zona escolar sin iluminación.',
    latitud: 20.3912,
    longitud: -99.9921,
    fechaCreacion: '2026-11-10T11:30:00.000Z',
    fechaActualizacion: '2026-11-10T12:10:00.000Z',
    idEstado: 2,
    estadoNombre: 'En Revisión',
    idCategoria: 3,
    categoriaNombre: 'Alumbrado',
    idDepartamento: 2,
    departamentoNombre: 'Servicios Públicos',
    idCiudadano: 1,
    ciudadanoNombre: 'Juan Ciudadano',
    idTrabajadorAsignado: 5,
    trabajadorNombre: 'Carlos Operativo SP',
    fotoInicialUrl: null,
    fotoResolucionUrl: null,
    motivoRechazo: null,
  },
  {
    idIncidencia: 103,
    descripcion: 'Bache profundo en carril central de Paseo Central a la altura del Parque Industrial.',
    latitud: 20.4015,
    longitud: -99.9884,
    fechaCreacion: '2026-11-09T14:20:00.000Z',
    fechaActualizacion: '2026-11-10T08:00:00.000Z',
    idEstado: 1,
    estadoNombre: 'Recibido',
    idCategoria: 4,
    categoriaNombre: 'Bacheo',
    idDepartamento: 2,
    departamentoNombre: 'Servicios Públicos',
    idCiudadano: 1,
    ciudadanoNombre: 'María González',
    idTrabajadorAsignado: null,
    trabajadorNombre: null,
    fotoInicialUrl: null,
    fotoResolucionUrl: null,
    motivoRechazo: null,
  },
  {
    idIncidencia: 104,
    descripcion: 'Alcantarilla sin rejilla en Av. Río Moctezuma, riesgo para peatones y vehículos.',
    latitud: 20.3845,
    longitud: -99.9812,
    fechaCreacion: '2026-11-08T16:40:00.000Z',
    fechaActualizacion: '2026-11-09T17:15:00.000Z',
    idEstado: 4,
    estadoNombre: 'Resuelto',
    idCategoria: 2,
    categoriaNombre: 'Alcantarillado',
    idDepartamento: 1,
    departamentoNombre: 'JAPAM',
    idCiudadano: 1,
    ciudadanoNombre: 'Roberto Ramírez',
    idTrabajadorAsignado: 2,
    trabajadorNombre: 'Pedro Trabajador',
    fotoInicialUrl: null,
    fotoResolucionUrl: 'https://images.unsplash.com/photo-1541888946425-d09bb18086f6?auto=format&fit=crop&w=600&q=80',
    motivoRechazo: null,
  },
  {
    idIncidencia: 105,
    descripcion: 'Supuesto hundimiento en calle sin nombre [RECHAZADO: Ubicación inexistente tras verificación de cuadrilla]',
    latitud: 20.379,
    longitud: -100.001,
    fechaCreacion: '2026-11-07T10:05:00.000Z',
    fechaActualizacion: '2026-11-07T13:20:00.000Z',
    idEstado: 5,
    estadoNombre: 'Rechazado',
    idCategoria: 4,
    categoriaNombre: 'Bacheo',
    idDepartamento: 2,
    departamentoNombre: 'Servicios Públicos',
    idCiudadano: 1,
    ciudadanoNombre: 'Reporte Anónimo',
    idTrabajadorAsignado: null,
    trabajadorNombre: null,
    fotoInicialUrl: null,
    fotoResolucionUrl: null,
    motivoRechazo: 'Ubicación inexistente tras verificación de cuadrilla',
  },
];

export class MockIncidenciaService implements IIncidenciaService {
  private incidencias: Incidencia[];

  constructor(semillas: Incidencia[] = INCIDENCIAS_SEMILLA) {
    this.incidencias = semillas.map((item) => ({ ...item }));
  }

  async listarIncidencias(filtros?: FiltrosIncidencias): Promise<Incidencia[]> {
    return this.incidencias
      .filter((item) => {
        if (
          filtros?.idDepartamento !== undefined &&
          filtros.idDepartamento !== null &&
          Number(item.idDepartamento) !== Number(filtros.idDepartamento)
        ) {
          return false;
        }
        if (
          filtros?.idEstado !== undefined &&
          filtros.idEstado !== null &&
          Number(item.idEstado) !== Number(filtros.idEstado)
        ) {
          return false;
        }
        if (
          filtros?.idTrabajadorAsignado !== undefined &&
          filtros.idTrabajadorAsignado !== null &&
          Number(item.idTrabajadorAsignado) !== Number(filtros.idTrabajadorAsignado)
        ) {
          return false;
        }
        return true;
      })
      .map((item) => ({ ...item }));
  }

  async asignarTrabajador(idIncidencia: number, idTrabajador: number): Promise<Incidencia> {
    const idx = this.incidencias.findIndex((i) => i.idIncidencia === Number(idIncidencia));
    if (idx === -1) {
      throw new Error('La incidencia indicada no existe.');
    }

    const actual = this.incidencias[idx];
    const actualizada: Incidencia = {
      ...actual,
      idTrabajadorAsignado: Number(idTrabajador),
      idEstado: 2,
      estadoNombre: ESTADOS_INCIDENCIA[2].nombre,
      fechaActualizacion: new Date().toISOString(),
    };
    this.incidencias[idx] = actualizada;
    return { ...actualizada };
  }

  async descartarIncidencia(idIncidencia: number, motivoRechazo: string): Promise<Incidencia> {
    const motivoLimpio = motivoRechazo.trim();
    if (motivoLimpio.length < 5) {
      throw new Error('Debe proporcionar un motivo de descarte válido de al menos 5 caracteres.');
    }

    const idx = this.incidencias.findIndex((i) => i.idIncidencia === Number(idIncidencia));
    if (idx === -1) {
      throw new Error('La incidencia indicada no existe.');
    }

    const actual = this.incidencias[idx];
    const descripcionConRechazo = actual.descripcion.includes('[RECHAZADO:')
      ? actual.descripcion
      : `${actual.descripcion} [RECHAZADO: ${motivoLimpio}]`;

    const actualizada: Incidencia = {
      ...actual,
      idEstado: 5,
      estadoNombre: ESTADOS_INCIDENCIA[5].nombre,
      descripcion: descripcionConRechazo,
      motivoRechazo: motivoLimpio,
      fechaActualizacion: new Date().toISOString(),
    };
    this.incidencias[idx] = actualizada;
    return { ...actualizada };
  }
}

