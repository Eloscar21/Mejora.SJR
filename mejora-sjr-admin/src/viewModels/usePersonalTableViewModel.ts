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
 * ViewModel para la UI de Gestión de Personal (DataGrid - US-009).
 * 
 * Implementa el patrón MVVM:
 * - Aísla la lógica de negocio y presentación del DataGrid de empleados.
 * - Consume IEmpleadoConsultaService (DIP) y IAuthService para control de sesión Zero-Trust.
 * - Gestiona el filtrado reactivo por búsqueda de texto (nombre/email), rol y estado.
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

  // 1. Cargar empleados validando sesión y RBAC estricto (Rol 4)
  useEffect(() => {
    let cancelado = false;
    isCargandoRef.current = true;
    setIsLoading(true);
    setErrorListado(null);

    const cargarDatos = async () => {
      try {
        const token = sesion.obtenerToken();
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

        // Comprobación de RBAC estricto (US-007 / US-009)
        if (payload.idRol !== 4) {
          setIdRolActor(payload.idRol);
          setErrorAcceso('La gestión de personal municipal está restringida exclusivamente a la cuenta de Superadministrador (IdRol 4).');
          return;
        }

        setIdRolActor(4);
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
                : 'El servidor no permite gestionar empleados con las credenciales actuales.'
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

  const puedeGestionar = idRolActor === 4 && !errorAcceso;

  // 2. Filtros computados en memoria para alto rendimiento (DataGrid)
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter((emp) => {
      // Filtro por texto (Nombre o Email)
      if (filtroTexto.trim()) {
        const busqueda = filtroTexto.toLowerCase().trim();
        const coincideNombre = emp.nombre.toLowerCase().includes(busqueda);
        const coincideEmail = emp.email.toLowerCase().includes(busqueda);
        if (!coincideNombre && !coincideEmail) return false;
      }

      // Filtro por Rol
      if (filtroRol !== 'todos' && emp.idRol !== filtroRol) {
        return false;
      }

      // Filtro por Estado
      if (filtroEstado === 'activos' && !emp.activo) return false;
      if (filtroEstado === 'inactivos' && emp.activo) return false;

      return true;
    });
  }, [empleados, filtroTexto, filtroRol, filtroEstado]);

  // 3. Métricas rápidas para las tarjetas KPI de cabecera
  const metricas = useMemo(() => {
    const total = empleados.length;
    const activos = empleados.filter((e) => e.activo).length;
    const trabajadores = empleados.filter((e) => e.idRol === 2).length;
    const administradores = empleados.filter((e) => e.idRol === 3).length;
    return { total, activos, trabajadores, administradores };
  }, [empleados]);

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
    if (!puedeGestionar || accionModal) return;
    setIsLoading(true);
    setVersion((v) => v + 1);
  }, [puedeGestionar, accionModal]);

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
