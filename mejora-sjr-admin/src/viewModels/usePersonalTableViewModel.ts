'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Empleado } from '../models/empleado.types';
import type { AccionFormularioPersonal, CambioPersonal } from '../models/personalFormulario.types';
import type { IAuthService } from '../services/contracts/IAuthService';
import type { IEmpleadoConsultaService } from '../services/contracts/IEmpleadoConsultaService';

export interface PersonalTableFeedback {
  tipo: 'success' | 'error';
  texto: string;
}

/**
 * usePersonalTableViewModel
 * ViewModel para la UI de Gestión de Personal (DataGrid - US-009 / US-021 / US-022).
 *
 * Implementa el patrón MVVM:
 * - Aísla la lógica de negocio y presentación del DataGrid de empleados.
 * - Consume IEmpleadoConsultaService (DIP) y IAuthService para control de sesión Zero-Trust.
 * - Gestiona el filtrado reactivo por búsqueda de texto (nombre/email), rol y estado booleano `activo`.
 * - Actualiza dinámicamente los contadores de las tarjetas superiores según los filtros aplicados (US-022).
 * - Orquesta las acciones de edición (lápiz) y desactivación (basurero).
 */
export function usePersonalTableViewModel(
  sesion: Pick<IAuthService, 'obtenerToken' | 'decodificarToken'>,
  consulta: IEmpleadoConsultaService
) {
  const [inicializando, setInicializando] = useState(true);
  const [idRolActor, setIdRolActor] = useState<number | null>(null);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorListado, setErrorListado] = useState<string | null>(null);

  // Filtros de tabla
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroRol, setFiltroRol] = useState<number | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos');

  // Estado del modal (Crear, Editar, Desactivar)
  const [accionModal, setAccionModal] = useState<AccionFormularioPersonal | null>(null);
  const [feedback, setFeedback] = useState<PersonalTableFeedback | null>(null);

  // Control de sincronización
  const [version, setVersion] = useState(0);
  const isCargandoRef = useRef(false);
  const tokenListadoRef = useRef<string | null>(null);

  // 1. US-021: consultar con rol 3 o 4; la API determina el alcance por departamento.
  useEffect(() => {
    let cancelado = false;
    isCargandoRef.current = true;
    setIsLoading(true);
    setErrorListado(null);

    const cargarDatos = async () => {
      try {
        const token = sesion.obtenerToken();
        if (tokenListadoRef.current !== token) {
          tokenListadoRef.current = token;
          setEmpleados([]);
          setAccionModal(null);
          setFeedback(null);
        }
        const payload = token ? sesion.decodificarToken(token) : null;

        // Comprobación de vigencia del JWT
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

        // Consultar personal no concede permiso para abrir formularios de gestión.
        if (payload.idRol !== 3 && payload.idRol !== 4) {
          setIdRolActor(payload.idRol);
          setErrorAcceso('La consulta de personal está disponible para administradores de departamento y Superadmin.');
          return;
        }

        setIdRolActor(payload.idRol);
        setErrorAcceso(null);

        const listado = await consulta.listarEmpleados();
        if (!cancelado) {
          setEmpleados(listado);
        }
      } catch (err: unknown) {
        if (!cancelado) {
          const status = typeof err === 'object' && err !== null && 'status' in err ? (err as { status: unknown }).status : null;
          if (status === 401 || status === 403) {
            setIdRolActor(null);
            setErrorAcceso(
              status === 401
                ? 'Sesión no autorizada. Vuelve a iniciar sesión.'
                : 'El servidor no permite consultar empleados con las credenciales actuales.'
            );
          }
          const mensaje = err instanceof Error ? err.message : 'Error al cargar el catálogo de empleados.';
          setErrorListado(mensaje);
        }
      } finally {
        if (!cancelado) {
          setInicializando(false);
          setIsLoading(false);
          isCargandoRef.current = false;
        }
      }
    };

    void cargarDatos();

    return () => {
      cancelado = true;
    };
  }, [sesion, consulta, version]);

  const puedeConsultar = (idRolActor === 3 || idRolActor === 4) && !errorAcceso;
  const puedeGestionar = idRolActor === 4 && !errorAcceso;

  // 2. Filtros computados en memoria para alto rendimiento (DataGrid - US-022)
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((emp) => {
      // Filtro por texto (Nombre o Email)
      if (filtroTexto.trim()) {
        const busqueda = filtroTexto.toLowerCase().trim();
        const coincideNombre = emp.nombre.toLowerCase().includes(busqueda);
        const coincideEmail = emp.email.toLowerCase().includes(busqueda);
        if (!coincideNombre && !coincideEmail) return false;
      }

      // Filtro por Rol ("Todos los roles" | Rol 2 | Rol 3)
      if (filtroRol !== 'todos' && Number(emp.idRol) !== Number(filtroRol)) {
        return false;
      }

      // Filtro por Estado basado estrictamente en la propiedad booleana `activo`
      const estaActivo = Boolean(emp.activo);
      if (filtroEstado === 'activos' && estaActivo !== true) return false;
      if (filtroEstado === 'inactivos' && estaActivo !== false) return false;

      return true;
    });
  }, [empleados, filtroTexto, filtroRol, filtroEstado]);

  // 3. Métricas reactivas para las tarjetas KPI superiores (US-022: se actualizan con los filtros)
  const metricas = useMemo(() => {
    const total = empleadosFiltrados.length;
    const activos = empleadosFiltrados.filter((e) => Boolean(e.activo) === true).length;
    const inactivos = empleadosFiltrados.filter((e) => Boolean(e.activo) === false).length;
    const trabajadores = empleadosFiltrados.filter((e) => Number(e.idRol) === 2).length;
    const administradores = empleadosFiltrados.filter((e) => Number(e.idRol) === 3).length;
    return { total, activos, inactivos, trabajadores, administradores };
  }, [empleadosFiltrados]);

  // 4. Acciones del DataGrid
  const abrirCrear = useCallback(() => {
    if (puedeGestionar && !accionModal) {
      setAccionModal({ tipo: 'crear' });
    }
  }, [puedeGestionar, accionModal]);

  const abrirEditar = useCallback((empleado: Empleado) => {
    if (puedeGestionar && !accionModal) {
      setAccionModal({ tipo: 'editar', empleado: { ...empleado } });
    }
  }, [puedeGestionar, accionModal]);

  const abrirDesactivar = useCallback((empleado: Empleado) => {
    if (puedeGestionar && !accionModal) {
      setAccionModal({ tipo: 'desactivar', empleado: { ...empleado } });
    }
  }, [puedeGestionar, accionModal]);

  const cerrarModal = useCallback(() => {
    setAccionModal(null);
  }, []);

  const recargar = useCallback(() => {
    if (!puedeConsultar || accionModal) return;
    setIsLoading(true);
    setVersion((v) => v + 1);
  }, [puedeConsultar, accionModal]);

  const limpiarFiltros = useCallback(() => {
    setFiltroTexto('');
    setFiltroRol('todos');
    setFiltroEstado('todos');
  }, []);

  // 5. Manejo optimista de cambios confirmados por los formularios
  const procesarCambio = useCallback((cambio: CambioPersonal) => {
    if (!puedeGestionar) return;

    if (cambio.tipo === 'creado') {
      setEmpleados((prev) => [cambio.empleado, ...prev]);
      setFeedback({
        tipo: 'success',
        texto: `Empleado "${cambio.empleado.nombre}" creado exitosamente.`
      });
    } else if (cambio.tipo === 'actualizado') {
      setEmpleados((prev) =>
        prev.map((emp) => (emp.idUsuario === cambio.empleado.idUsuario ? cambio.empleado : emp))
      );
      setFeedback({
        tipo: 'success',
        texto: `Empleado "${cambio.empleado.nombre}" actualizado correctamente.`
      });
    } else if (cambio.tipo === 'desactivado') {
      setEmpleados((prev) =>
        prev.map((emp) => (emp.idUsuario === cambio.idUsuario ? { ...emp, activo: false } : emp))
      );
      setFeedback({
        tipo: 'success',
        texto: `Empleado ID #${cambio.idUsuario} desactivado lógicamente.`
      });
    }

    // Sincronizar en segundo plano con el servidor
    setVersion((v) => v + 1);
  }, [puedeGestionar]);

  const limpiarFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    // Estados de inicialización y sesión
    inicializando,
    idRolActor,
    puedeConsultar,
    puedeGestionar,
    errorAcceso,

    // Estados del DataGrid
    empleados: empleadosFiltrados,
    totalOriginal: empleados.length,
    isLoading,
    errorListado,
    metricas,

    // Filtros
    filtroTexto,
    setFiltroTexto,
    filtroRol,
    setFiltroRol,
    filtroEstado,
    setFiltroEstado,
    limpiarFiltros,

    // Acciones de la tabla (Botón Crear, Lápiz, Basurero)
    abrirCrear,
    abrirEditar,
    abrirDesactivar,
    cerrarModal,
    accionModal,
    procesarCambio,
    recargar,

    // Notificaciones
    feedback,
    limpiarFeedback,
  };
}
