import React, { useMemo } from 'react';
import { useAuth } from './AuthProvider';
import type { IReporteSubmissionService } from '../services/contracts/IReporteSubmissionService';
import type { IReporteEjemploService } from '../services/contracts/IReporteEjemploService';
import type { IReporteConsultaService } from '../services/contracts/IReporteConsultaService';
import type { IPerfilService } from '../services/contracts/IPerfilService';
import { ReporteApiService } from '../services/api/ReporteApiService';
import { ReporteConsultaApiService } from '../services/api/ReporteConsultaApiService';
import { PerfilApiService } from '../services/api/PerfilApiService';
import { MockReporteEjemploService } from '../services/mocks/MockReporteEjemploService';
import { useReportesCiudadanoViewModel } from '../viewModels/useReportesCiudadanoViewModel';
import { useMisDatosViewModel } from '../viewModels/useMisDatosViewModel';
import { CrearReporteView } from '../views/CrearReporteView';
import { MisReportesView } from '../views/MisReportesView';
import { MisDatosView } from '../views/MisDatosView';

interface ReporteProviderProps {
  submissionService?: IReporteSubmissionService;
  ejemplosService?: IReporteEjemploService;
  consultaService?: IReporteConsultaService;
  perfilService?: IPerfilService;
}

/** Compone envío HTTP real y entradas emuladas, sin añadir responsabilidades a AuthProvider. */
export function ReporteProvider({
  submissionService,
  ejemplosService,
  consultaService,
  perfilService,
}: ReporteProviderProps) {
  const { authService, catalogoService, storageService, session, actualizarSesionUsuario, cerrarSesion } = useAuth();
  const envio = useMemo(() => submissionService ?? new ReporteApiService(authService), [submissionService, authService]);
  const ejemplos = useMemo(() => ejemplosService ?? new MockReporteEjemploService(), [ejemplosService]);
  const consulta = useMemo(() => consultaService ?? new ReporteConsultaApiService(authService), [consultaService, authService]);
  const perfil = useMemo(
    () => perfilService ?? new PerfilApiService(authService, undefined, storageService),
    [perfilService, authService, storageService]
  );

  const viewModel = useReportesCiudadanoViewModel({
    catalogoService,
    submissionService: envio,
    ejemplosService: ejemplos,
    consultaService: consulta,
    session,
    onCerrarSesion: cerrarSesion,
  });

  const misDatosVm = useMisDatosViewModel({
    perfilService: perfil,
    session,
    onActualizarSesion: actualizarSesionUsuario,
    onCerrarSesion: cerrarSesion,
  });

  return (
    <>
      <CrearReporteView viewModel={{ ...viewModel.formulario, verMisDatos: misDatosVm.abrir }} />
      <MisReportesView viewModel={viewModel.lista} />
      <MisDatosView viewModel={misDatosVm} />
    </>
  );
}
