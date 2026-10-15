import type { IInicioSesionService } from './IInicioSesionService';

export interface EstadoSesion {
  fase: 'verificando' | 'login' | 'activa' | 'error';
  mensaje: string | null;
}

export interface IControlSesion extends IInicioSesionService {
  obtenerEstado(): EstadoSesion;
  suscribir(listener: () => void): () => void;
  restaurar(): Promise<void>;
  cambiarActividad(activa: boolean): Promise<void>;
  mantenerActiva(): Promise<void>;
  cerrar(): Promise<void>;
}
