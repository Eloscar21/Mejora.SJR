import React, { useMemo } from 'react';
import type { IBandejaConsultaService } from '../services/contracts/IBandejaConsultaService';
import type { IPerfilService } from '../services/contracts/IPerfilService';
import { BandejaConsultaApiService } from '../services/api/BandejaConsultaApiService';
import { PerfilApiService } from '../services/api/PerfilApiService';
import { MockBandejaConsultaService } from '../services/mocks/MockBandejaConsultaService';
import { useAuth } from './AuthProvider';
import { useBandejaViewModel } from '../viewModels/useBandejaViewModel';
import { useMisDatosViewModel } from '../viewModels/useMisDatosViewModel';
import { BandejaOrdenesView } from '../views/BandejaOrdenesView';
import { MisDatosView } from '../views/MisDatosView';

interface BandejaProviderProps {
  consultaService?: IBandejaConsultaService;
  perfilService?: IPerfilService;
}

/** Composición de US-033 + Perfil Trabajador: conecta bandeja operativa y gestión de datos/contraseña. */
export function BandejaProvider({ consultaService, perfilService }: BandejaProviderProps) {
  const { authService, storageService, session, actualizarSesionUsuario, cerrarSesion } = useAuth();
  const consulta = useMemo(
    () =>
      consultaService ??
      (authService ? new BandejaConsultaApiService(authService) : new MockBandejaConsultaService()),
    [consultaService, authService]
  );
  const perfil = useMemo(
    () => perfilService ?? new PerfilApiService(authService, undefined, storageService),
    [perfilService, authService, storageService]
  );

  const viewModel = useBandejaViewModel(consulta);
  const misDatosVm = useMisDatosViewModel({
    perfilService: perfil,
    session,
    onActualizarSesion: actualizarSesionUsuario,
    onCerrarSesion: cerrarSesion,
  });

  return (
    <>
      <BandejaOrdenesView viewModel={viewModel} onVerMisDatos={misDatosVm.abrir} />
      <MisDatosView viewModel={misDatosVm} />
    </>
  );
}
