import React, { useMemo } from 'react';
import type { IBandejaConsultaService } from '../services/contracts/IBandejaConsultaService';
import { BandejaConsultaApiService } from '../services/api/BandejaConsultaApiService';
import { MockBandejaConsultaService } from '../services/mocks/MockBandejaConsultaService';
import { useAuth } from './AuthProvider';
import { useBandejaViewModel } from '../viewModels/useBandejaViewModel';
import { BandejaOrdenesView } from '../views/BandejaOrdenesView';

interface BandejaProviderProps { consultaService?: IBandejaConsultaService }

/** Composición de US-033: conecta con la API real de incidencias para trabajadores asignados. */
export function BandejaProvider({ consultaService }: BandejaProviderProps) {
  const { authService } = useAuth();
  const consulta = useMemo(
    () =>
      consultaService ??
      (authService ? new BandejaConsultaApiService(authService) : new MockBandejaConsultaService()),
    [consultaService, authService]
  );
  const viewModel = useBandejaViewModel(consulta);
  return <BandejaOrdenesView viewModel={viewModel} />;
}
