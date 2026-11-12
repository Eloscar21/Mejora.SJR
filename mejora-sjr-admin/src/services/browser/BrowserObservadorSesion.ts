import type { IObservadorSesion } from '../contracts/IObservadorSesion';

export class BrowserObservadorSesion implements IObservadorSesion {
  suscribir(onCambio: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('storage', onCambio);
    window.addEventListener('focus', onCambio);
    return () => {
      window.removeEventListener('storage', onCambio);
      window.removeEventListener('focus', onCambio);
    };
  }
}
