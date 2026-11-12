/**
 * app/dashboard/incidencias/page.tsx
 * Pantalla de Bandeja de Incidencias en Admin (DataGrid y Acciones - US-026).
 *
 * Requerimiento US-026:
 * "Vista /dashboard/incidencias con filtros por secretaría, modal para descartar falsos
 * y selector de asignación a trabajador."
 */

'use client';

import React, { useMemo } from 'react';
import { AuthApiService } from '@/services/api/AuthApiService';
import { EmpleadoApiService } from '@/services/api/EmpleadoApiService';
import { IncidenciaApiService } from '@/services/api/IncidenciaApiService';
import { MockIncidenciaService } from '@/services/mocks/MockIncidenciaService';
import { useIncidenciasViewModel } from '@/viewModels/useIncidenciasViewModel';
import { IncidenciasDataGrid } from '@/views/incidencias/IncidenciasDataGrid';

export default function DashboardIncidenciasPage() {
  const authService = useMemo(() => new AuthApiService(), []);
  const incidenciaService = useMemo(
    () =>
      process.env.NEXT_PUBLIC_USE_MOCK === 'true'
        ? new MockIncidenciaService()
        : new IncidenciaApiService(authService),
    [authService]
  );
  const empleadoService = useMemo(() => new EmpleadoApiService(authService), [authService]);

  const viewModel = useIncidenciasViewModel(authService, incidenciaService, empleadoService);

  return <IncidenciasDataGrid viewModel={viewModel} />;
}

