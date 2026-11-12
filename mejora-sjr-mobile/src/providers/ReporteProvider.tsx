import React, { useMemo } from 'react';
import { useAuth } from './AuthProvider';
import type { IReporteSubmissionService } from '../services/contracts/IReporteSubmissionService';
import type { IReporteEjemploService } from '../services/contracts/IReporteEjemploService';
import type { IReporteConsultaService } from '../services/contracts/IReporteConsultaService';
import { ReporteApiService } from '../services/api/ReporteApiService';
import { ReporteConsultaApiService } from '../services/api/ReporteConsultaApiService';
import { MockReporteEjemploService } from '../services/mocks/MockReporteEjemploService';
import { useReportesCiudadanoViewModel } from '../viewModels/useReportesCiudadanoViewModel';
import { CrearReporteView } from '../views/CrearReporteView';
import { MisReportesView } from '../views/MisReportesView';

interface ReporteProviderProps {
  submissionService?: IReporteSubmissionService;
  ejemplosService?: IReporteEjemploService;
  consultaService?: IReporteConsultaService;
}

/** Compone envío HTTP real y entradas emuladas, sin añadir responsabilidades a AuthProvider. */
export function ReporteProvider({ submissionService, ejemplosService, consultaService }: ReporteProviderProps) {
  const { authService, catalogoService, session, cerrarSesion } = useAuth();
  const envio = useMemo(() => submissionService ?? new ReporteApiService(authService), [submissionService, authService]);
  const ejemplos = useMemo(() => ejemplosService ?? new MockReporteEjemploService(), [ejemplosService]);
  const consulta = useMemo(() => consultaService ?? new ReporteConsultaApiService(authService), [consultaService, authService]);
  const viewModel = useReportesCiudadanoViewModel({
    catalogoService,
    submissionService: envio,
    ejemplosService: ejemplos,
    consultaService: consulta,
    session,
    onCerrarSesion: cerrarSesion,
  });
  return <>
    <CrearReporteView viewModel={viewModel.formulario} />
    <MisReportesView viewModel={viewModel.lista} />
  </>;
}
