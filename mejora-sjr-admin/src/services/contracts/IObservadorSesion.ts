/** Permite reaccionar a cambios externos de sesión sin acoplar el ViewModel al navegador. */
export interface IObservadorSesion {
  suscribir(onCambio: () => void): () => void;
}
