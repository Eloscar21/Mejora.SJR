/**
 * MockCatalogoService.ts
 * Implementación en memoria de ICatalogoService para pruebas y administración local de catálogos (US-027 / US-002).
 * Cumple con el Principio de Sustitución de Liskov (LSP).
 */

import type {
  CategoriaReporte,
  Departamento,
  GuardarCategoriaPayload,
  GuardarDepartamentoPayload,
} from '../../models/catalogo.types';
import type { ICatalogoService } from '../contracts/ICatalogoService';

export const DEPARTAMENTOS_OFICIALES_SEMILLA: Departamento[] = [
  {
    idDepartamento: 1,
    nombre: 'JAPAM',
    siglas: 'JAPAM',
    descripcion: 'Junta de Agua Potable y Alcantarillado Municipal de San Juan del Río.',
    titular: 'Dirección Operativa Hidráulica',
    activo: true,
  },
  {
    idDepartamento: 2,
    nombre: 'Servicios Públicos',
    siglas: 'SSPP',
    descripcion: 'Secretaría de Servicios Públicos Municipales (Alumbrado, Bacheo e Imagen Urbana).',
    titular: 'Coordinación de Mantenimiento Urbano',
    activo: true,
  },
];

export const CATEGORIAS_OFICIALES_SEMILLA: CategoriaReporte[] = [
  {
    idCategoria: 1,
    nombre: 'Fugas de agua',
    idDepartamento: 1,
    departamentoNombre: 'JAPAM',
    descripcion: 'Ruptura o filtración en red hidráulica, tomas domiciliarias o válvulas en vía pública.',
    prioridad: 'Alta',
    slaHoras: 24,
    activo: true,
  },
  {
    idCategoria: 2,
    nombre: 'Alcantarillado',
    idDepartamento: 1,
    departamentoNombre: 'JAPAM',
    descripcion: 'Azolve, colapso de drenaje sanitario, brotes o falta de brocales y rejillas pluviales.',
    prioridad: 'Alta',
    slaHoras: 36,
    activo: true,
  },
  {
    idCategoria: 3,
    nombre: 'Alumbrado',
    idDepartamento: 2,
    departamentoNombre: 'Servicios Públicos',
    descripcion: 'Luminarias apagadas, intermitentes, postes dañados o fotoceldas averiadas.',
    prioridad: 'Media',
    slaHoras: 48,
    activo: true,
  },
  {
    idCategoria: 4,
    nombre: 'Bacheo',
    idDepartamento: 2,
    departamentoNombre: 'Servicios Públicos',
    descripcion: 'Deterioro de carpeta asfáltica, hundimientos o desprendimiento de adoquín en vialidades.',
    prioridad: 'Media',
    slaHoras: 72,
    activo: true,
  },
];

export class MockCatalogoService implements ICatalogoService {
  private departamentos: Departamento[];
  private categorias: CategoriaReporte[];

  constructor(
    departamentosSemilla: Departamento[] = DEPARTAMENTOS_OFICIALES_SEMILLA,
    categoriasSemilla: CategoriaReporte[] = CATEGORIAS_OFICIALES_SEMILLA
  ) {
    this.departamentos = departamentosSemilla.map((d) => ({ ...d }));
    this.categorias = categoriasSemilla.map((c) => ({ ...c }));
  }

  async obtenerDepartamentos(): Promise<Departamento[]> {
    return this.departamentos.map((d) => ({ ...d }));
  }

  async obtenerCategorias(idDepartamento?: number | null): Promise<CategoriaReporte[]> {
    const lista =
      idDepartamento !== undefined && idDepartamento !== null
        ? this.categorias.filter((c) => Number(c.idDepartamento) === Number(idDepartamento))
        : this.categorias;

    return lista.map((c) => {
      const depto = this.departamentos.find((d) => d.idDepartamento === c.idDepartamento);
      return {
        ...c,
        departamentoNombre: depto ? depto.nombre : c.departamentoNombre,
      };
    });
  }

  async crearDepartamento(payload: GuardarDepartamentoPayload): Promise<Departamento> {
    const nombreLimpio = payload.nombre.trim();
    if (nombreLimpio.length < 2) {
      throw new Error('El nombre de la dependencia debe tener al menos 2 caracteres.');
    }

    const duplicado = this.departamentos.some(
      (d) => d.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (duplicado) {
      throw new Error('Ya existe una dependencia registrada con ese nombre.');
    }

    const maxId = this.departamentos.reduce((max, d) => Math.max(max, d.idDepartamento), 0);
    const nuevo: Departamento = {
      idDepartamento: maxId + 1,
      nombre: nombreLimpio,
      siglas: payload.siglas?.trim() || nombreLimpio.slice(0, 6).toUpperCase(),
      descripcion:
        payload.descripcion?.trim() || 'Dependencia municipal de atención ciudadana.',
      titular: payload.titular?.trim() || 'Dirección General',
      activo: payload.activo !== undefined ? Boolean(payload.activo) : true,
    };

    this.departamentos.push(nuevo);
    return { ...nuevo };
  }

  async actualizarDepartamento(
    idDepartamento: number,
    payload: GuardarDepartamentoPayload
  ): Promise<Departamento> {
    const idx = this.departamentos.findIndex((d) => d.idDepartamento === Number(idDepartamento));
    if (idx === -1) {
      throw new Error('Dependencia no encontrada en el catálogo.');
    }

    const nombreLimpio = payload.nombre.trim();
    if (nombreLimpio.length < 2) {
      throw new Error('El nombre de la dependencia debe tener al menos 2 caracteres.');
    }

    const actualizado: Departamento = {
      ...this.departamentos[idx],
      nombre: nombreLimpio,
      siglas: payload.siglas?.trim() || this.departamentos[idx].siglas,
      descripcion: payload.descripcion?.trim() ?? this.departamentos[idx].descripcion,
      titular: payload.titular?.trim() ?? this.departamentos[idx].titular,
      activo: payload.activo !== undefined ? Boolean(payload.activo) : this.departamentos[idx].activo,
    };

    this.departamentos[idx] = actualizado;
    this.categorias = this.categorias.map((c) =>
      c.idDepartamento === actualizado.idDepartamento
        ? { ...c, departamentoNombre: actualizado.nombre }
        : c
    );

    return { ...actualizado };
  }

  async crearCategoria(payload: GuardarCategoriaPayload): Promise<CategoriaReporte> {
    const nombreLimpio = payload.nombre.trim();
    if (nombreLimpio.length < 3) {
      throw new Error('El nombre de la categoría debe tener al menos 3 caracteres.');
    }

    const depto = this.departamentos.find(
      (d) => d.idDepartamento === Number(payload.idDepartamento)
    );
    if (!depto) {
      throw new Error('Debe seleccionar una dependencia válida.');
    }

    const duplicada = this.categorias.some(
      (c) =>
        c.idDepartamento === depto.idDepartamento &&
        c.nombre.toLowerCase() === nombreLimpio.toLowerCase()
    );
    if (duplicada) {
      throw new Error('Ya existe una categoría con ese nombre en la dependencia seleccionada.');
    }

    const maxId = this.categorias.reduce((max, c) => Math.max(max, c.idCategoria), 0);
    const nueva: CategoriaReporte = {
      idCategoria: maxId + 1,
      nombre: nombreLimpio,
      idDepartamento: depto.idDepartamento,
      departamentoNombre: depto.nombre,
      descripcion:
        payload.descripcion?.trim() ||
        'Categoría de atención operativa para reportes ciudadanos.',
      prioridad: payload.prioridad || 'Media',
      slaHoras: Number(payload.slaHoras) > 0 ? Number(payload.slaHoras) : 48,
      activo: payload.activo !== undefined ? Boolean(payload.activo) : true,
    };

    this.categorias.push(nueva);
    return { ...nueva };
  }

  async actualizarCategoria(
    idCategoria: number,
    payload: GuardarCategoriaPayload
  ): Promise<CategoriaReporte> {
    const idx = this.categorias.findIndex((c) => c.idCategoria === Number(idCategoria));
    if (idx === -1) {
      throw new Error('Categoría no encontrada en el catálogo.');
    }

    const nombreLimpio = payload.nombre.trim();
    if (nombreLimpio.length < 3) {
      throw new Error('El nombre de la categoría debe tener al menos 3 caracteres.');
    }

    const depto = this.departamentos.find(
      (d) => d.idDepartamento === Number(payload.idDepartamento)
    );
    if (!depto) {
      throw new Error('Debe seleccionar una dependencia válida.');
    }

    const actualizada: CategoriaReporte = {
      ...this.categorias[idx],
      nombre: nombreLimpio,
      idDepartamento: depto.idDepartamento,
      departamentoNombre: depto.nombre,
      descripcion: payload.descripcion?.trim() ?? this.categorias[idx].descripcion,
      prioridad: payload.prioridad ?? this.categorias[idx].prioridad,
      slaHoras:
        payload.slaHoras !== undefined && Number(payload.slaHoras) > 0
          ? Number(payload.slaHoras)
          : this.categorias[idx].slaHoras,
      activo:
        payload.activo !== undefined ? Boolean(payload.activo) : this.categorias[idx].activo,
    };

    this.categorias[idx] = actualizada;
    return { ...actualizada };
  }

  async cambiarEstadoCategoria(idCategoria: number, activo: boolean): Promise<CategoriaReporte> {
    const idx = this.categorias.findIndex((c) => c.idCategoria === Number(idCategoria));
    if (idx === -1) {
      throw new Error('Categoría no encontrada en el catálogo.');
    }

    const actualizada: CategoriaReporte = {
      ...this.categorias[idx],
      activo: Boolean(activo),
    };
    this.categorias[idx] = actualizada;
    return { ...actualizada };
  }

  /** Sincroniza los registros base provenientes de GET /api/catalogos/* sin perder enriquecimiento. */
  sincronizarDesdeRemoto(
    departamentosRemotos: Array<{ idDepartamento: number; nombre: string }>,
    categoriasRemotas: Array<{
      idCategoria: number;
      nombre: string;
      idDepartamento: number;
      departamentoNombre?: string;
    }>
  ): void {
    for (const remoto of departamentosRemotos) {
      const idx = this.departamentos.findIndex(
        (d) => d.idDepartamento === Number(remoto.idDepartamento)
      );
      if (idx >= 0) {
        this.departamentos[idx] = {
          ...this.departamentos[idx],
          nombre: remoto.nombre,
        };
      } else {
        this.departamentos.push({
          idDepartamento: Number(remoto.idDepartamento),
          nombre: remoto.nombre,
          siglas: remoto.nombre.slice(0, 6).toUpperCase(),
          descripcion: 'Dependencia municipal oficial.',
          titular: 'Dirección Municipal',
          activo: true,
        });
      }
    }

    for (const remota of categoriasRemotas) {
      const idx = this.categorias.findIndex((c) => c.idCategoria === Number(remota.idCategoria));
      const depto = this.departamentos.find(
        (d) => d.idDepartamento === Number(remota.idDepartamento)
      );
      const deptoNombre =
        remota.departamentoNombre || (depto ? depto.nombre : `Depto #${remota.idDepartamento}`);

      if (idx >= 0) {
        this.categorias[idx] = {
          ...this.categorias[idx],
          nombre: remota.nombre,
          idDepartamento: Number(remota.idDepartamento),
          departamentoNombre: deptoNombre,
        };
      } else {
        this.categorias.push({
          idCategoria: Number(remota.idCategoria),
          nombre: remota.nombre,
          idDepartamento: Number(remota.idDepartamento),
          departamentoNombre: deptoNombre,
          descripcion: 'Categoría oficial de reporte ciudadano.',
          prioridad: 'Media',
          slaHoras: 48,
          activo: true,
        });
      }
    }
  }
}

