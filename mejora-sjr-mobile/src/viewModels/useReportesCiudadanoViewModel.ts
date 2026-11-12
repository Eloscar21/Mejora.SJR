import { useState, useCallback } from 'react';
import type { NuevaIncidenciaDTO } from '../models/incidencia.types';
import type { IReporteConsultaService } from '../services/contracts/IReporteConsultaService';
import { useReporteViewModel, type ReporteViewModelDependencies } from './useReporteViewModel';
import { useMisReportesViewModel } from './useMisReportesViewModel';

interface Dependencies extends Omit<ReporteViewModelDependencies, 'onPendienteChange'> {
  consultaService: IReporteConsultaService;
}

/** Mantiene el borrador mientras se abre su consulta y exige confirmación humana antes de descartarlo. */
export function useReportesCiudadanoViewModel(dependencies: Dependencies) {
  const [solicitudPendiente, setSolicitudPendiente] = useState<NuevaIncidenciaDTO | null>(null);
  const formulario = useReporteViewModel({ ...dependencies, onPendienteChange: setSolicitudPendiente });
  const lista = useMisReportesViewModel({
    consultaService: dependencies.consultaService,
    session: dependencies.session,
    categorias: formulario.categorias,
    solicitudPendiente,
  });
  const confirmarExistente = useCallback((idIncidencia: number) => {
    const reporte = lista.obtenerReporteVerificado(idIncidencia);
    if (reporte && formulario.confirmarReporteExistente(reporte)) lista.cerrar();
  }, [lista.obtenerReporteVerificado, lista.cerrar, formulario.confirmarReporteExistente]);
  return {
    formulario: { ...formulario, verMisReportes: lista.abrir },
    lista: { ...lista, confirmarExistente },
  };
}
