'use client';

import type { IAuthService } from '../services/contracts/IAuthService';
import type { IConfiguracionServices } from '../services/contracts/IConfiguracionServices';
import type { ICopiadoService } from '../services/contracts/ICopiadoService';
import type { IObservadorSesion } from '../services/contracts/IObservadorSesion';
import { useAccesoConfiguracionViewModel } from './useAccesoConfiguracionViewModel';
import { useCambioPasswordViewModel } from './useCambioPasswordViewModel';
import { useBandejaPasswordViewModel } from './useBandejaPasswordViewModel';
import { useResolucionPasswordViewModel } from './useResolucionPasswordViewModel';

/** Coordina ViewModels pequeños; no conoce implementaciones HTTP ni detalles visuales. */
export function useConfiguracionViewModel(
  sesion: Pick<IAuthService, 'obtenerToken' | 'decodificarToken'>,
  servicios: IConfiguracionServices,
  observador: IObservadorSesion,
  onReautenticar: () => void | Promise<void>,
  copiado?: ICopiadoService
) {
  const acceso = useAccesoConfiguracionViewModel(sesion, observador);
  const cambio = useCambioPasswordViewModel(acceso, servicios.cambioClave, onReautenticar);
  const bandeja = useBandejaPasswordViewModel(acceso, servicios.solicitudesConsulta);
  const resolucion = useResolucionPasswordViewModel(acceso, servicios.solicitudesGestion,
    servicios.solicitudesConsulta, bandeja.obtenerPendiente, bandeja.registrarResolucion, copiado);
  return { acceso, cambio, bandeja, resolucion };
}
