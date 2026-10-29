'use client';

import React, { useMemo } from 'react';
import { AuthApiService } from '@/services/api/AuthApiService';
import { crearPersonalApiServices } from '@/providers/crearPersonalApiServices';
import { usePersonalTableViewModel } from '@/viewModels/usePersonalTableViewModel';
import { PersonalDataGrid } from '@/views/personal/PersonalDataGrid';

/**
 * /dashboard/personal
 * Vista unificada de Personal Municipal en el dashboard (US-009).
 */
export default function DashboardPersonalPage() {
  const authService = useMemo(() => new AuthApiService(), []);
  const servicios = useMemo(() => crearPersonalApiServices(authService), [authService]);
  const viewModel = usePersonalTableViewModel(authService, servicios.consulta);

  return <PersonalDataGrid viewModel={viewModel} servicios={servicios} />;
}
