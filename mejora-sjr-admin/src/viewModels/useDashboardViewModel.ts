/**
 * useDashboardViewModel.ts
 * ViewModel para el Dashboard Ejecutivo de Gestión Municipal (US-014).
 *
 * Principios aplicados:
 * - MVVM: Encapsula toda la lógica de estado, filtrado jurisdiccional, KPIs y recarga.
 * - DIP: Depende exclusivamente de las abstracciones IAuthService e IDashboardService.
 * - RBAC Departamental: Acota automáticamente las métricas a la dependencia asignada para IdRol = 3,
 *   y habilita supervisión global o filtrada por dependencia para Superadmin (IdRol = 4).
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { IAuthService } from '../services/contracts/IAuthService';
import { IDashboardService } from '../services/contracts/IDashboardService';
import { AuthApiService } from '../services/api/AuthApiService';
import { DashboardApiService } from '../services/api/DashboardApiService';
import { MockDashboardService } from '../services/mocks/MockDashboardService';
import { DEPARTAMENTOS_SJR, ROLES_SJR, UsuarioSession } from '../models/auth.types';
import {
  DashboardResumenEjecutivo,
  FiltroEstadoDashboard,
  FiltroJurisdiccionDepto,
  ReporteEjecutivoReciente,
} from '../models/dashboard.types';

const defaultAuthService: IAuthService = new AuthApiService();
const defaultDashboardService: IDashboardService =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true'
    ? new MockDashboardService()
    : new DashboardApiService();

export function useDashboardViewModel(
  authService: IAuthService = defaultAuthService,
  dashboardService: IDashboardService = defaultDashboardService
) {
  const [usuario, setUsuario] = useState<UsuarioSession | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [filtroJurisdiccion, setFiltroJurisdiccion] = useState<FiltroJurisdiccionDepto>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoDashboard>('TODOS');
  const [resumen, setResumen] = useState<DashboardResumenEjecutivo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // 1. Resolver sesión activa del funcionario municipal
  useEffect(() => {
    const storedUser = authService.obtenerUsuario();
    if (storedUser) {
      setUsuario(storedUser);
    } else {
      const decoded = authService.decodificarToken();
      if (decoded) {
        setUsuario({
          idUsuario: decoded.idUsuario,
          nombre: decoded.email.split('@')[0],
          email: decoded.email,
          idRol: decoded.idRol,
          idDepartamento: decoded.idDepartamento,
        });
      }
    }
    setSesionLista(true);
  }, [authService]);

  const esSuperadmin = usuario?.idRol === 4;

  // Determinar qué departamento consultar según RBAC y el filtro ejecutivo
  const departamentoEfectivo = useMemo<number | null>(() => {
    if (!usuario) return null;
    if (usuario.idRol === 3) {
      return usuario.idDepartamento;
    }
    if (filtroJurisdiccion === 'TODOS') {
      return null;
    }
    return filtroJurisdiccion;
  }, [usuario, filtroJurisdiccion]);

  const cargarMetricas = useCallback(async () => {
    if (!sesionLista) return;

    setIsLoading(true);
    setErrorCarga(null);

    try {
      const data = await dashboardService.obtenerResumenEjecutivo(departamentoEfectivo);
      setResumen(data);
    } catch (err: unknown) {
      const mensaje =
        err instanceof Error
          ? err.message
          : 'No fue posible actualizar los indicadores municipales en este momento.';
      setErrorCarga(mensaje);
    } finally {
      setIsLoading(false);
    }
  }, [sesionLista, dashboardService, departamentoEfectivo]);

  useEffect(() => {
    cargarMetricas();
  }, [cargarMetricas]);

  const cambiarJurisdiccion = useCallback(
    (nuevaJurisdiccion: FiltroJurisdiccionDepto) => {
      if (!esSuperadmin) return;
      setFiltroJurisdiccion(nuevaJurisdiccion);
      setFiltroEstado('TODOS');
    },
    [esSuperadmin]
  );

  const alternarFiltroEstado = useCallback((estado: FiltroEstadoDashboard) => {
    setFiltroEstado((prev) => (prev === estado ? 'TODOS' : estado));
  }, []);

  const reportesVisibles = useMemo<ReporteEjecutivoReciente[]>(() => {
    if (!resumen) return [];
    if (filtroEstado === 'TODOS') return resumen.reportesRecientes;
    return resumen.reportesRecientes.filter((r) => r.estadoKpi === filtroEstado);
  }, [resumen, filtroEstado]);

  const rolEtiqueta = usuario?.idRol
    ? ROLES_SJR[usuario.idRol as keyof typeof ROLES_SJR] || `Rol ${usuario.idRol}`
    : 'Funcionario Municipal';

  const jurisdiccionEtiqueta = useMemo(() => {
    if (departamentoEfectivo === 1) return DEPARTAMENTOS_SJR[1];
    if (departamentoEfectivo === 2) return DEPARTAMENTOS_SJR[2];
    return 'Jurisdicción Municipal Global';
  }, [departamentoEfectivo]);

  const fechaInstitucional = useMemo(() => {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const horaActualizacionTexto = useMemo(() => {
    if (!resumen?.ultimaActualizacionIso) return 'Sincronizando...';
    return new Date(resumen.ultimaActualizacionIso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [resumen?.ultimaActualizacionIso]);

  return {
    usuario,
    esSuperadmin,
    rolEtiqueta,
    jurisdiccionEtiqueta,
    fechaInstitucional,
    horaActualizacionTexto,
    filtroJurisdiccion,
    filtroEstado,
    resumen,
    reportesVisibles,
    isLoading,
    errorCarga,
    cambiarJurisdiccion,
    alternarFiltroEstado,
    recargar: cargarMetricas,
  };
}

