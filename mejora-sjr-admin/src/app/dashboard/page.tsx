/**
 * app/dashboard/page.tsx
 * Punto de entrada del Dashboard Ejecutivo Municipal (US-014).
 *
 * Ensambla dependencias mediante inversión de control (AuthApiService + DashboardApiService)
 * y renderiza DashboardEjecutivoView libre de detalles técnicos de JWT.
 */

'use client';

import React, { useMemo } from 'react';
import { AuthApiService } from '@/services/api/AuthApiService';
import { DashboardApiService } from '@/services/api/DashboardApiService';
import { MockDashboardService } from '@/services/mocks/MockDashboardService';
import { useDashboardViewModel } from '@/viewModels/useDashboardViewModel';
import { DashboardEjecutivoView } from '@/views/dashboard/DashboardEjecutivoView';

export default function DashboardEjecutivoPage() {
  const authService = useMemo(() => new AuthApiService(), []);
  const dashboardService = useMemo(
    () =>
      process.env.NEXT_PUBLIC_USE_MOCK === 'true'
        ? new MockDashboardService()
        : new DashboardApiService(),
    []
  );

  const viewModel = useDashboardViewModel(authService, dashboardService);

  return <DashboardEjecutivoView viewModel={viewModel} />;
}
