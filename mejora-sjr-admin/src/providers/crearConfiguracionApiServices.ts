import { CambioPasswordApiService } from '../services/api/CambioPasswordApiService';
import { SolicitudPasswordApiService } from '../services/api/SolicitudPasswordApiService';
import type { IAuthService } from '../services/contracts/IAuthService';
import type { IConfiguracionServices } from '../services/contracts/IConfiguracionServices';

/** Composición de US-029. No selecciona mocks ante fallos de conexión. */
export function crearConfiguracionApiServices(
  sesion: Pick<IAuthService, 'obtenerToken'>,
  baseUrl?: string,
  fetcher?: typeof fetch
): IConfiguracionServices {
  const solicitudes = new SolicitudPasswordApiService(sesion, baseUrl, fetcher);
  return {
    cambioClave: new CambioPasswordApiService(sesion, baseUrl, fetcher),
    solicitudesConsulta: solicitudes,
    solicitudesGestion: solicitudes,
  };
}
