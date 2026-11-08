import React, { useMemo } from 'react';
import type { IBandejaConsultaService } from '../services/contracts/IBandejaConsultaService';
import { MockBandejaConsultaService } from '../services/mocks/MockBandejaConsultaService';
import { useBandejaViewModel } from '../viewModels/useBandejaViewModel';
import { BandejaOrdenesView } from '../views/BandejaOrdenesView';

interface BandejaProviderProps { consultaService?: IBandejaConsultaService }

/** Composición de US-017: la bandeja es explícitamente de demostración hasta disponer de API. */
export function BandejaProvider({ consultaService }: BandejaProviderProps) {
  const consulta = useMemo(() => consultaService ?? new MockBandejaConsultaService(), [consultaService]);
  const viewModel = useBandejaViewModel(consulta);
  return <BandejaOrdenesView viewModel={viewModel} />;
}
