import type { ICambioPasswordService } from './ICambioPasswordService';
import type { ISolicitudPasswordConsultaService } from './ISolicitudPasswordConsultaService';
import type { ISolicitudPasswordGestionService } from './ISolicitudPasswordGestionService';

/** Agrupación exclusiva de la composición: cada ViewModel recibirá su contrato pequeño. */
export interface IConfiguracionServices {
  cambioClave: ICambioPasswordService;
  solicitudesConsulta: ISolicitudPasswordConsultaService;
  solicitudesGestion: ISolicitudPasswordGestionService;
}
