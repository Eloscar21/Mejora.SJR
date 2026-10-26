/**
 * useBandejaViewModel.ts
 * ViewModel para la pantalla de "Bandeja de Órdenes de Trabajo" (Trabajador - Rol 2).
 * 
 * Principios aplicados:
 * - MVVM: Orquesta la lista de órdenes asignadas al trabajador municipal.
 * - SRP: Maneja el filtrado de estados de órdenes de campo y actualización de estatus.
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { Incidencia } from '../models/incidencia.types';

export function useBandejaViewModel() {
  const { session, cerrarSesion } = useAuth();

  const [filtroEstado, setFiltroEstado] = useState<number | null>(null);
  const [ordenes, setOrdenes] = useState<Incidencia[]>([
    {
      idIncidencia: 101,
      descripcion: 'Fuga de agua potable visible sobre banqueta con derrame constante.',
      latitud: 20.3889,
      longitud: -99.9961,
      idCategoria: 1,
      categoriaNombre: 'Fugas de agua',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
      idEstado: 3, // En Progreso
      estadoNombre: 'En Progreso',
      idUsuario: 1,
      ciudadanoNombre: 'Ciudadano Juan Pérez',
      idTrabajadorAsignado: session?.idUsuario || 2,
      trabajadorNombre: session?.nombre || 'Pedro Gómez',
      fechaCreacion: '2026-10-25 09:30',
      direccionReferencia: 'Av. Juárez Poniente #112, Col. Centro',
    },
    {
      idIncidencia: 102,
      descripcion: 'Coladera de alcantarillado sin tapa, riesgo latente para peatones y autos.',
      latitud: 20.3921,
      longitud: -99.9915,
      idCategoria: 2,
      categoriaNombre: 'Alcantarillado',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
      idEstado: 1, // Recibido
      estadoNombre: 'Recibido',
      idUsuario: 1,
      ciudadanoNombre: 'Ciudadano Juan Pérez',
      idTrabajadorAsignado: session?.idUsuario || 2,
      trabajadorNombre: session?.nombre || 'Pedro Gómez',
      fechaCreacion: '2026-10-26 08:15',
      direccionReferencia: 'Calle Rayón esq. Galeana, Barrio de la Cruz',
    },
    {
      idIncidencia: 103,
      descripcion: 'Falla intermitente en luminarias LED públicas sobre camellón.',
      latitud: 20.3754,
      longitud: -99.9842,
      idCategoria: 3,
      categoriaNombre: 'Alumbrado',
      idDepartamento: 2,
      departamentoNombre: 'Servicios Públicos',
      idEstado: 2, // En Revisión
      estadoNombre: 'En Revisión',
      idUsuario: 1,
      ciudadanoNombre: 'María Trejo',
      idTrabajadorAsignado: null,
      fechaCreacion: '2026-10-24 18:40',
      direccionReferencia: 'Boulevard Hidalgo #450, Col. San Cayetano',
    },
  ]);

  // Filtrar órdenes por el departamento del trabajador si está asignado
  const ordenesFiltradas = useMemo(() => {
    let list = ordenes;
    if (session?.idDepartamento) {
      list = list.filter((o) => o.idDepartamento === session.idDepartamento);
    }
    if (filtroEstado !== null) {
      list = list.filter((o) => o.idEstado === filtroEstado);
    }
    return list;
  }, [ordenes, session?.idDepartamento, filtroEstado]);

  // Actualizar estado de una orden de trabajo
  const handleCambiarEstado = useCallback((idIncidencia: number, nuevoEstado: number) => {
    const nombresEstados: { [key: number]: string } = {
      1: 'Recibido',
      2: 'En Revisión',
      3: 'En Progreso',
      4: 'Atendido',
      5: 'Rechazado',
    };

    setOrdenes((prev) =>
      prev.map((ord) =>
        ord.idIncidencia === idIncidencia
          ? {
              ...ord,
              idEstado: nuevoEstado,
              estadoNombre: nombresEstados[nuevoEstado] || ord.estadoNombre,
            }
          : ord
      )
    );
  }, []);

  return {
    session,
    ordenes: ordenesFiltradas,
    totalOrdenes: ordenes.length,
    filtroEstado,
    setFiltroEstado,
    handleCambiarEstado,
    cerrarSesion,
  };
}
