import type { ReporteCiudadano } from '../../models/reporteCiudadano.types';

/** La identidad se obtiene de la sesión, nunca de un ID elegido por el consumidor. */
export interface IReporteConsultaService {
  listarMisReportes(): Promise<ReporteCiudadano[]>;
}
