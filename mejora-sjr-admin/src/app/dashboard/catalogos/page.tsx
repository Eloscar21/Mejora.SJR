/**
 * app/dashboard/catalogos/page.tsx
 * Pantalla de Administración de Catálogos Municipales (US-027).
 *
 * Requerimiento US-027:
 * "Vista /dashboard/catalogos para visualizar y gestionar dependencias y categorías de reportes."
 */

'use client';

import React, { useMemo } from 'react';
import { AuthApiService } from '@/services/api/AuthApiService';
import { CatalogoApiService } from '@/services/api/CatalogoApiService';
import { MockCatalogoService } from '@/services/mocks/MockCatalogoService';
import { useCatalogosViewModel } from '@/viewModels/useCatalogosViewModel';
import { CatalogosMunicipalesView } from '@/views/catalogos/CatalogosMunicipalesView';

export default function DashboardCatalogosPage() {
  const authService = useMemo(() => new AuthApiService(), []);
  const catalogoService = useMemo(
    () =>
      process.env.NEXT_PUBLIC_USE_MOCK === 'true'
        ? new MockCatalogoService()
        : new CatalogoApiService(),
    []
  );

  const viewModel = useCatalogosViewModel(authService, catalogoService);

  return <CatalogosMunicipalesView viewModel={viewModel} />;
}

