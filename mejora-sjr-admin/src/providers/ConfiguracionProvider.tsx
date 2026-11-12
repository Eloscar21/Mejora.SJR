'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AuthApiService } from '../services/api/AuthApiService';
import { BrowserCopiadoService } from '../services/browser/BrowserCopiadoService';
import { BrowserObservadorSesion } from '../services/browser/BrowserObservadorSesion';
import { useConfiguracionViewModel } from '../viewModels/useConfiguracionViewModel';
import { ConfiguracionView } from '../views/configuracion/ConfiguracionView';
import { crearConfiguracionApiServices } from './crearConfiguracionApiServices';

/** Punto de composición: adaptadores, sesión, navegador y navegación se inyectan aquí. */
export function ConfiguracionProvider() {
  const router = useRouter();
  const sesion = useMemo(() => new AuthApiService(), []);
  const servicios = useMemo(() => crearConfiguracionApiServices(sesion), [sesion]);
  const observador = useMemo(() => new BrowserObservadorSesion(), []);
  const copiado = useMemo(() => new BrowserCopiadoService(), []);
  const onReautenticar = useCallback(() => {
    sesion.logout();
    router.replace('/login');
  }, [sesion, router]);
  const vm = useConfiguracionViewModel(sesion, servicios, observador, onReautenticar, copiado);
  return <ConfiguracionView viewModel={vm} />;
}
