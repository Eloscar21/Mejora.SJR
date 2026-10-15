import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import type { IControlSesion } from '../services/contracts/IControlSesion';

/** Adapta eventos nativos al coordinador; la lógica temporal vive fuera de React. */
export function useSesionViewModel(control: IControlSesion) {
  const estado = useSyncExternalStore(control.suscribir, control.obtenerEstado);

  useEffect(() => {
    void control.cambiarActividad(AppState.currentState === 'active');
    void control.restaurar();
    const subscription = AppState.addEventListener('change', (valor) => {
      void control.cambiarActividad(valor === 'active');
    });
    const intervalo = setInterval(() => { void control.mantenerActiva(); }, 30000);
    return () => {
      subscription.remove();
      clearInterval(intervalo);
    };
  }, [control]);

  return {
    ...estado,
    cerrarSesion: () => control.cerrar(),
    reintentar: () => control.restaurar(),
  };
}