import type { IBandejaConsultaService } from '../contracts/IBandejaConsultaService';
import type { Incidencia } from '../../models/incidencia.types';

const base: Omit<Incidencia, 'idIncidencia' | 'descripcion' | 'idEstado' | 'estadoNombre'> = {
  latitud: 20.3889, longitud: -99.9961,
  idCategoria: 1, categoriaNombre: 'Fugas de agua',
  idDepartamento: 1, departamentoNombre: 'JAPAM',
  idUsuario: 1, ciudadanoNombre: 'Ciudadano de ejemplo',
  idTrabajadorAsignado: 2, trabajadorNombre: 'Trabajador de ejemplo',
  fechaCreacion: '07/11/2026 · 09:30',
  direccionReferencia: 'Referencia de ejemplo · Colonia Centro, San Juan del Río',
};

// Asignaciones fijas de demostración. No se modifican según quien inicia sesión.
const ejemplos: readonly Incidencia[] = [
  { ...base, idIncidencia: 101, descripcion: 'Fuga de agua sobre la banqueta, frente al parque.', idEstado: 3, estadoNombre: 'En Progreso' },
  { ...base, idIncidencia: 102, idCategoria: 2, categoriaNombre: 'Alcantarillado', descripcion: 'Coladera sin tapa junto al paso peatonal.', idEstado: 1, estadoNombre: 'Recibido' },
  { ...base, idIncidencia: 104, descripcion: 'Escurrimiento constante de agua en una esquina.', idEstado: 2, estadoNombre: 'En Revisión' },
  { ...base, idIncidencia: 105, idCategoria: 2, categoriaNombre: 'Alcantarillado', descripcion: 'Obstrucción en una rejilla de desagüe.', idEstado: 4, estadoNombre: 'Atendido' },
  { ...base, idIncidencia: 106, descripcion: 'Reporte de ejemplo descartado durante la revisión.', idEstado: 5, estadoNombre: 'Rechazado' },
  { ...base, idIncidencia: 107, idTrabajadorAsignado: 8, descripcion: 'Ejemplo asignado a otro trabajador del mismo departamento.', idEstado: 1, estadoNombre: 'Recibido' },
  { ...base, idIncidencia: 103, idTrabajadorAsignado: null, trabajadorNombre: null, descripcion: 'Ejemplo que todavía no tiene trabajador asignado.', idEstado: 2, estadoNombre: 'En Revisión' },
];

/** Fuente de consulta de demostración, sin HTTP ni persistencia de tareas. */
export class MockBandejaConsultaService implements IBandejaConsultaService {
  async listarAsignadas(idTrabajador: number): Promise<Incidencia[]> {
    if (!Number.isSafeInteger(idTrabajador) || idTrabajador <= 0) {
      throw new Error('Se requiere un identificador de trabajador válido.');
    }
    return ejemplos
      .filter((tarea) => tarea.idTrabajadorAsignado === idTrabajador)
      .map((tarea) => ({ ...tarea }));
  }
}
