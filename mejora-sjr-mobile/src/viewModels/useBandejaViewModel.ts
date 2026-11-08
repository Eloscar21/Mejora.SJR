import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import type { IBandejaConsultaService } from '../services/contracts/IBandejaConsultaService';
import type { Incidencia } from '../models/incidencia.types';
import type { EstadoVisualTarea, FiltroBandeja, FiltroEstadoTarea, TareaBandeja } from '../models/bandeja.types';

const filtrosBase: readonly { value: FiltroEstadoTarea; label: string }[] = [
  { value: null, label: 'Todas' },
  { value: 1, label: 'Recibidas' },
  { value: 2, label: 'En revisión' },
  { value: 3, label: 'En curso' },
  { value: 4, label: 'Atendidas' },
  { value: 5, label: 'Rechazadas' },
];

const estados: Record<number, { label: string; visual: EstadoVisualTarea }> = {
  1: { label: 'Recibida', visual: 'recibida' },
  2: { label: 'En revisión', visual: 'revision' },
  3: { label: 'En curso', visual: 'progreso' },
  4: { label: 'Atendida', visual: 'atendida' },
  5: { label: 'Rechazada', visual: 'rechazada' },
};

/** Consulta y prepara únicamente las tareas asignadas; no modifica estados ni persiste incidencias. */
export function useBandejaViewModel(consulta: IBandejaConsultaService) {
  const { session, cerrarSesion: cerrarSesionActual } = useAuth();
  const idTrabajador = session?.idUsuario;
  const perfilValido = session?.idRol === 2 && Number.isSafeInteger(idTrabajador) && (idTrabajador ?? 0) > 0;
  const [ordenes, setOrdenes] = useState<Incidencia[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoTarea>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setOrdenes([]);
    setErrorCarga(null);
    if (!perfilValido || idTrabajador === undefined) {
      setIsLoading(false);
      return () => { active = false; };
    }
    setIsLoading(true);

    const cargar = async () => {
      try {
        const result = await consulta.listarAsignadas(idTrabajador);
        if (active) setOrdenes(result.filter((tarea) => tarea.idTrabajadorAsignado === idTrabajador));
      } catch (error: unknown) {
        if (active) setErrorCarga(error instanceof Error ? error.message : 'No se pudieron consultar las tareas de ejemplo.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void cargar();
    return () => { active = false; };
  }, [consulta, perfilValido, idTrabajador, version]);

  const asignadas = useMemo(() => perfilValido
    ? ordenes.filter((tarea) => tarea.idTrabajadorAsignado === idTrabajador)
    : [], [ordenes, perfilValido, idTrabajador]);

  const tareas = useMemo<TareaBandeja[]>(() => asignadas
    .filter((tarea) => filtroEstado === null || tarea.idEstado === filtroEstado)
    .map((tarea) => ({
      idIncidencia: tarea.idIncidencia,
      categoria: tarea.categoriaNombre || 'Sin categoría',
      descripcion: tarea.descripcion,
      direccion: tarea.direccionReferencia || 'Sin referencia de ubicación',
      fecha: tarea.fechaCreacion,
      reportante: tarea.ciudadanoNombre,
      estadoLabel: estados[tarea.idEstado]?.label || 'Estado no disponible',
      estadoVisual: estados[tarea.idEstado]?.visual || 'desconocido',
    })), [asignadas, filtroEstado]);

  const filtros = useMemo<FiltroBandeja[]>(() => filtrosBase.map((filtro) => ({
    ...filtro,
    count: filtro.value === null ? asignadas.length : asignadas.filter((tarea) => tarea.idEstado === filtro.value).length,
    selected: filtro.value === filtroEstado,
  })), [asignadas, filtroEstado]);

  const cambiarFiltro = useCallback((value: FiltroEstadoTarea) => {
    if (filtrosBase.some((filtro) => filtro.value === value)) setFiltroEstado(value);
  }, []);

  const recargar = useCallback(() => {
    if (perfilValido && !isLoading) setVersion((actual) => actual + 1);
  }, [perfilValido, isLoading]);

  const cerrarSesion = useCallback(async () => {
    try {
      await cerrarSesionActual();
    } catch {
      // El proveedor representa el fallo en SessionClosingView y permite reintentar.
    }
  }, [cerrarSesionActual]);

  const error = perfilValido ? errorCarga : 'Esta bandeja requiere una sesión de trabajador válida.';
  const listStatus = error ? 'error' : isLoading ? 'loading' : tareas.length === 0 ? 'empty' : 'ready';

  return {
    session, tareas, filtros, filtroEstado, cambiarFiltro,
    totalAsignadas: asignadas.length,
    pendientes: asignadas.filter((tarea) => tarea.idEstado === 1 || tarea.idEstado === 2).length,
    enCurso: asignadas.filter((tarea) => tarea.idEstado === 3).length,
    isLoading, error, listStatus,
    puedeRecargar: perfilValido && !isLoading,
    emptyTitle: asignadas.length === 0 ? 'No tienes tareas asignadas' : 'No hay tareas con este filtro',
    emptyMessage: asignadas.length === 0
      ? 'La demostración no tiene tareas asociadas a tu usuario.'
      : 'Selecciona otro estado para consultar tus tareas de ejemplo.',
    recargar, cerrarSesion,
  };
}
