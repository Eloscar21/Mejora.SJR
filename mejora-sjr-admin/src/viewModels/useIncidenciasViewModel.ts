'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Empleado } from '../models/empleado.types';
import {
  ESTADOS_INCIDENCIA,
  type Incidencia,
  type MetricasIncidencias,
} from '../models/incidencia.types';
import type { IAuthService } from '../services/contracts/IAuthService';
import type { IEmpleadoConsultaService } from '../services/contracts/IEmpleadoConsultaService';
import type { IIncidenciaService } from '../services/contracts/IIncidenciaService';

export interface IncidenciaFeedback {
  tipo: 'success' | 'error';
  texto: string;
}

const TRABAJADORES_FALLBACK: Empleado[] = [
  {
    idUsuario: 2,
    nombre: 'Pedro Trabajador (Cuadrilla Hidráulica)',
    email: 'trabajador@test.com',
    idRol: 2,
    idDepartamento: 1,
    departamentoNombre: 'JAPAM',
    activo: true,
  },
  {
    idUsuario: 5,
    nombre: 'Carlos Operativo SP (Alumbrado y Bacheo)',
    email: 'trabajador.sp@test.com',
    idRol: 2,
    idDepartamento: 2,
    departamentoNombre: 'Servicios Públicos',
    activo: true,
  },
];

/**
 * useIncidenciasViewModel
 * ViewModel para la Bandeja de Incidencias en Admin (DataGrid y Acciones - US-026).
 *
 * Implementa el patrón MVVM:
 * - Aísla la lógica de filtrado por secretaría, estado y texto.
 * - Aplica alcance jurisdiccional RBAC (Superadmin Rol 4 ve todas las secretarías; Admin Rol 3 ve su secretaría).
 * - Gestiona el selector de asignación a trabajador operativo (Rol 2 del mismo departamento).
 * - Orquesta el modal para descartar reportes falsos con validación de motivo de auditoría (>= 5 caracteres).
 */
export function useIncidenciasViewModel(
  sesion: Pick<IAuthService, 'obtenerToken' | 'decodificarToken'>,
  incidenciaService: IIncidenciaService,
  empleadoConsulta?: IEmpleadoConsultaService
) {
  const [inicializando, setInicializando] = useState(true);
  const [idRolActor, setIdRolActor] = useState<number | null>(null);
  const [idDepartamentoActor, setIdDepartamentoActor] = useState<number | null>(null);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [trabajadores, setTrabajadores] = useState<Empleado[]>(TRABAJADORES_FALLBACK);
  const [isLoading, setIsLoading] = useState(true);
  const [errorListado, setErrorListado] = useState<string | null>(null);

  // Filtros del DataGrid
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroSecretaria, setFiltroSecretariaState] = useState<number | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<number | 'todos'>('todos');

  // Selector de asignación por fila (idIncidencia -> idTrabajador)
  const [seleccionTrabajador, setSeleccionTrabajador] = useState<Record<number, number>>({});
  const [asignandoId, setAsignandoId] = useState<number | null>(null);

  // Estado del Modal para Descartar Reportes Falsos
  const [incidenciaADescartar, setIncidenciaADescartar] = useState<Incidencia | null>(null);
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [errorMotivoDescarte, setErrorMotivoDescarte] = useState<string | null>(null);
  const [descartando, setDescartando] = useState(false);

  const [feedback, setFeedback] = useState<IncidenciaFeedback | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    setErrorListado(null);

    const cargarBandeja = async () => {
      try {
        const token = sesion.obtenerToken();
        const payload = token ? sesion.decodificarToken(token) : null;

        if (
          !payload ||
          typeof payload.exp !== 'number' ||
          !Number.isFinite(payload.exp) ||
          payload.exp <= Date.now() / 1000
        ) {
          setIdRolActor(null);
          setErrorAcceso('Tu sesión ha expirado o no es válida. Inicia sesión nuevamente.');
          return;
        }

        if (payload.idRol !== 3 && payload.idRol !== 4) {
          setIdRolActor(payload.idRol);
          setErrorAcceso('La bandeja de incidencias es exclusiva para Administradores y Superadmin.');
          return;
        }

        const deptoActor =
          payload.idDepartamento !== undefined && payload.idDepartamento !== null
            ? Number(payload.idDepartamento)
            : null;

        setIdRolActor(payload.idRol);
        setIdDepartamentoActor(deptoActor);
        setErrorAcceso(null);

        if (payload.idRol === 3 && deptoActor) {
          setFiltroSecretariaState(deptoActor);
        }

        const [listaIncidencias, listaEmpleados] = await Promise.all([
          incidenciaService.listarIncidencias(
            payload.idRol === 3 && deptoActor ? { idDepartamento: deptoActor } : undefined
          ),
          empleadoConsulta
            ? empleadoConsulta.listarEmpleados().catch(() => TRABAJADORES_FALLBACK)
            : Promise.resolve(TRABAJADORES_FALLBACK),
        ]);

        if (!cancelado) {
          setIncidencias(listaIncidencias);

          const operativosActivos = listaEmpleados.filter(
            (emp) => Number(emp.idRol) === 2 && Boolean(emp.activo) === true
          );
          setTrabajadores(
            operativosActivos.length > 0 ? operativosActivos : TRABAJADORES_FALLBACK
          );

          const mapaInicial: Record<number, number> = {};
          for (const inc of listaIncidencias) {
            if (inc.idTrabajadorAsignado) {
              mapaInicial[inc.idIncidencia] = inc.idTrabajadorAsignado;
            }
          }
          setSeleccionTrabajador((prev) => ({ ...mapaInicial, ...prev }));
        }
      } catch (err: unknown) {
        if (!cancelado) {
          const status =
            typeof err === 'object' && err !== null && 'status' in err
              ? (err as { status: unknown }).status
              : null;
          if (status === 401 || status === 403) {
            setIdRolActor(null);
            setErrorAcceso('No cuentas con permisos suficientes para consultar incidencias.');
          }
          setErrorListado(
            err instanceof Error ? err.message : 'Error al cargar la bandeja de incidencias.'
          );
        }
      } finally {
        if (!cancelado) {
          setInicializando(false);
          setIsLoading(false);
        }
      }
    };

    void cargarBandeja();

    return () => {
      cancelado = true;
    };
  }, [sesion, incidenciaService, empleadoConsulta, version]);

  const puedeAcceder = (idRolActor === 3 || idRolActor === 4) && !errorAcceso;
  const puedeCambiarSecretaria = idRolActor === 4;

  const setFiltroSecretaria = useCallback(
    (valor: number | 'todos') => {
      if (idRolActor === 3 && idDepartamentoActor) {
        setFiltroSecretariaState(idDepartamentoActor);
        return;
      }
      setFiltroSecretariaState(valor);
    },
    [idRolActor, idDepartamentoActor]
  );

  // Filtrado reactivo en memoria
  const incidenciasFiltradas = useMemo(() => {
    return incidencias.filter((inc) => {
      // 1. Alcance RBAC para Rol 3
      if (idRolActor === 3 && idDepartamentoActor && Number(inc.idDepartamento) !== idDepartamentoActor) {
        return false;
      }

      // 2. Filtro por Secretaría
      if (filtroSecretaria !== 'todos' && Number(inc.idDepartamento) !== Number(filtroSecretaria)) {
        return false;
      }

      // 3. Filtro por Estado
      if (filtroEstado !== 'todos' && Number(inc.idEstado) !== Number(filtroEstado)) {
        return false;
      }

      // 4. Filtro por texto (Folio, Descripción, Categoría, Secretaría, Ciudadano o Trabajador)
      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase().trim();
        const folio = `#inc-${String(inc.idIncidencia).padStart(3, '0')}`;
        const coincide =
          folio.includes(q) ||
          String(inc.idIncidencia).includes(q) ||
          inc.descripcion.toLowerCase().includes(q) ||
          inc.categoriaNombre.toLowerCase().includes(q) ||
          inc.departamentoNombre.toLowerCase().includes(q) ||
          (inc.ciudadanoNombre || '').toLowerCase().includes(q) ||
          (inc.trabajadorNombre || '').toLowerCase().includes(q);
        if (!coincide) return false;
      }

      return true;
    });
  }, [incidencias, idRolActor, idDepartamentoActor, filtroSecretaria, filtroEstado, filtroTexto]);

  // Contadores reactivos para tarjetas KPI superiores
  const metricas: MetricasIncidencias = useMemo(() => {
    const total = incidenciasFiltradas.length;
    const recibidos = incidenciasFiltradas.filter((i) => Number(i.idEstado) === 1).length;
    const enProceso = incidenciasFiltradas.filter(
      (i) => Number(i.idEstado) === 2 || Number(i.idEstado) === 3
    ).length;
    const resueltos = incidenciasFiltradas.filter((i) => Number(i.idEstado) === 4).length;
    const descartados = incidenciasFiltradas.filter((i) => Number(i.idEstado) === 5).length;
    return { total, recibidos, enProceso, resueltos, descartados };
  }, [incidenciasFiltradas]);

  // Obtener trabajadores operativos activos del mismo departamento que la incidencia
  const obtenerTrabajadoresPorDepto = useCallback(
    (idDepartamento: number): Empleado[] => {
      return trabajadores.filter(
        (t) =>
          Number(t.idRol) === 2 &&
          Boolean(t.activo) === true &&
          Number(t.idDepartamento) === Number(idDepartamento)
      );
    },
    [trabajadores]
  );

  const seleccionarTrabajadorFila = useCallback((idIncidencia: number, idTrabajador: number) => {
    setSeleccionTrabajador((prev) => ({
      ...prev,
      [idIncidencia]: Number(idTrabajador),
    }));
  }, []);

  const asignarTrabajador = useCallback(
    async (idIncidencia: number, idTrabajadorExplicito?: number) => {
      if (!puedeAcceder) return;

      const idTrabajador =
        idTrabajadorExplicito !== undefined
          ? Number(idTrabajadorExplicito)
          : Number(seleccionTrabajador[idIncidencia]);

      if (!idTrabajador || isNaN(idTrabajador)) {
        setFeedback({
          tipo: 'error',
          texto: 'Selecciona un trabajador operativo antes de confirmar la asignación.',
        });
        return;
      }

      setAsignandoId(idIncidencia);
      setFeedback(null);

      try {
        const actualizada = await incidenciaService.asignarTrabajador(idIncidencia, idTrabajador);
        const trabajadorObj = trabajadores.find((t) => Number(t.idUsuario) === idTrabajador);

        setIncidencias((prev) =>
          prev.map((inc) =>
            inc.idIncidencia === idIncidencia
              ? {
                  ...inc,
                  ...actualizada,
                  idTrabajadorAsignado: idTrabajador,
                  trabajadorNombre:
                    trabajadorObj?.nombre || actualizada.trabajadorNombre || `Trabajador #${idTrabajador}`,
                  idEstado: actualizada.idEstado || 2,
                  estadoNombre: ESTADOS_INCIDENCIA[2].nombre,
                }
              : inc
          )
        );

        setFeedback({
          tipo: 'success',
          texto: `Incidencia #INC-${String(idIncidencia).padStart(3, '0')} asignada a ${
            trabajadorObj?.nombre || `Trabajador #${idTrabajador}`
          }.`,
        });
      } catch (err: unknown) {
        setFeedback({
          tipo: 'error',
          texto: err instanceof Error ? err.message : 'No se pudo asignar el trabajador.',
        });
      } finally {
        setAsignandoId(null);
      }
    },
    [puedeAcceder, seleccionTrabajador, incidenciaService, trabajadores]
  );

  // Acciones del Modal de Descarte de Reportes Falsos
  const abrirModalDescartar = useCallback(
    (incidencia: Incidencia) => {
      if (!puedeAcceder) return;
      setIncidenciaADescartar(incidencia);
      setMotivoDescarte('');
      setErrorMotivoDescarte(null);
    },
    [puedeAcceder]
  );

  const cerrarModalDescartar = useCallback(() => {
    if (descartando) return;
    setIncidenciaADescartar(null);
    setMotivoDescarte('');
    setErrorMotivoDescarte(null);
  }, [descartando]);

  const confirmarDescarteFalso = useCallback(async () => {
    if (!puedeAcceder || !incidenciaADescartar) return;

    const motivoLimpio = motivoDescarte.trim();
    if (motivoLimpio.length < 5) {
      setErrorMotivoDescarte('Ingresa un motivo de descarte válido (mínimo 5 caracteres).');
      return;
    }

    setDescartando(true);
    setErrorMotivoDescarte(null);

    try {
      const idIncidencia = incidenciaADescartar.idIncidencia;
      const actualizada = await incidenciaService.descartarIncidencia(idIncidencia, motivoLimpio);

      setIncidencias((prev) =>
        prev.map((inc) =>
          inc.idIncidencia === idIncidencia
            ? {
                ...inc,
                ...actualizada,
                idEstado: 5,
                estadoNombre: ESTADOS_INCIDENCIA[5].nombre,
                motivoRechazo: motivoLimpio,
              }
            : inc
        )
      );

      setIncidenciaADescartar(null);
      setMotivoDescarte('');
      setFeedback({
        tipo: 'success',
        texto: `Reporte #INC-${String(idIncidencia).padStart(3, '0')} descartado como falso/improcedente.`,
      });
    } catch (err: unknown) {
      setErrorMotivoDescarte(
        err instanceof Error ? err.message : 'No se pudo descartar la incidencia.'
      );
    } finally {
      setDescartando(false);
    }
  }, [puedeAcceder, incidenciaADescartar, motivoDescarte, incidenciaService]);

  const limpiarFiltros = useCallback(() => {
    setFiltroTexto('');
    setFiltroEstado('todos');
    if (idRolActor === 4) {
      setFiltroSecretariaState('todos');
    }
  }, [idRolActor]);

  const recargar = useCallback(() => {
    if (!puedeAcceder) return;
    setIsLoading(true);
    setVersion((v) => v + 1);
  }, [puedeAcceder]);

  const limpiarFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    inicializando,
    idRolActor,
    idDepartamentoActor,
    puedeAcceder,
    puedeCambiarSecretaria,
    errorAcceso,

    incidencias: incidenciasFiltradas,
    totalOriginal: incidencias.length,
    isLoading,
    errorListado,
    metricas,

    filtroTexto,
    setFiltroTexto,
    filtroSecretaria,
    setFiltroSecretaria,
    filtroEstado,
    setFiltroEstado,
    limpiarFiltros,

    trabajadores,
    obtenerTrabajadoresPorDepto,
    seleccionTrabajador,
    seleccionarTrabajadorFila,
    asignarTrabajador,
    asignandoId,

    incidenciaADescartar,
    motivoDescarte,
    setMotivoDescarte,
    errorMotivoDescarte,
    descartando,
    abrirModalDescartar,
    cerrarModalDescartar,
    confirmarDescarteFalso,

    feedback,
    limpiarFeedback,
    recargar,
  };
}

