import type { CredencialesLogin } from '../models/Login';
import type { IInicioSesionService } from './contracts/IInicioSesionService';
import type { IRenovacionService } from './contracts/IRenovacionService';
import type { ITokenStorage } from './contracts/ITokenStorage';
import type { ISalidaStorage } from './contracts/ISalidaStorage';
import type { IControlSesion, EstadoSesion } from './contracts/IControlSesion';

/** Serializa login, renovación, cambios de actividad y borrado para evitar carreras. */
export class ControlSesion implements IControlSesion {
  private estado: EstadoSesion = { fase: 'verificando', mensaje: null };
  private listeners = new Set<() => void>();
  private cola: Promise<unknown> = Promise.resolve();
  private token: string | null = null;
  private autorizada = false;
  private cierrePendiente = false;
  private activa = true;
  private ultimaSalida: number | null = null;
  private generacion = 0;
  private actividadVersion = 0;
  private ultimaRenovacion = 0;
  private manteniendo = false;
  private readonly inicio: IInicioSesionService;
  private readonly renovacion: IRenovacionService;
  private readonly tokens: ITokenStorage;
  private readonly salida: ISalidaStorage;
  private readonly ahora: () => number;
  private readonly tiempo: { permiteRegresoPorTiempo(): Promise<boolean> };

  constructor(inicio: IInicioSesionService, renovacion: IRenovacionService,
    tokens: ITokenStorage, salida: ISalidaStorage,
    tiempo: { permiteRegresoPorTiempo(): Promise<boolean> }, ahora: () => number = Date.now) {
    this.inicio = inicio; this.renovacion = renovacion;
    this.tokens = tokens; this.salida = salida; this.tiempo = tiempo; this.ahora = ahora;
  }

  obtenerEstado = (): EstadoSesion => this.estado;
  suscribir = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publicar(fase: EstadoSesion['fase'], mensaje: string | null = null) {
    this.estado = { fase, mensaje };
    this.listeners.forEach((listener) => listener());
  }

  private ejecutar<T>(operacion: () => Promise<T>): Promise<T> {
    const siguiente = this.cola.then(operacion);
    this.cola = siguiente.catch(() => undefined);
    return siguiente;
  }

  private async borrar(mensaje: string | null = null) {
    this.token = null;
    this.autorizada = false;
    this.cierrePendiente = true;
    try {
      // Si no se puede borrar el token, tampoco borramos su marca temporal.
      await this.tokens.eliminar();
      await this.salida.eliminar();
      this.cierrePendiente = false;
      this.publicar('login', mensaje);
    } catch {
      this.publicar('error', 'No se pudo limpiar la sesión. Reintenta cerrar sesión.');
    }
  }

  iniciar(credenciales: CredencialesLogin): Promise<void> {
    const version = this.generacion;
    const actividad = this.actividadVersion;
    return this.ejecutar(async () => {
      if (this.estado.fase !== 'login' || version !== this.generacion) throw new Error('La sesión está ocupada.');
      await this.inicio.iniciar(credenciales);
      if (version !== this.generacion) throw new Error('Inicio cancelado.');
      try {
        this.token = await this.tokens.leer();
        if (!this.token) throw new Error('No se guardó la sesión.');
        // Punto de recuperación conservador ante muerte del proceso sin evento de salida.
        await this.salida.guardar(actividad === this.actividadVersion ? this.ahora() : (this.ultimaSalida ?? this.ahora()));
        this.ultimaRenovacion = this.ahora();
        this.autorizada = true;
        if (version === this.generacion) this.publicar(this.activa && actividad === this.actividadVersion ? 'activa' : 'verificando');
      } catch {
        await this.borrar();
        throw new Error('No se pudo preparar la sesión de forma segura.');
      }
    });
  }

  restaurar(): Promise<void> {
    return this.ejecutar(() => this.comprobarRegreso());
  }

  private async comprobarRegreso() {
    const version = this.generacion;
    if (!this.activa) return;
    if (this.cierrePendiente) { await this.borrar(); return; }
    this.publicar('verificando');
    try {
      this.token = await this.tokens.leer();
      if (!this.token) { await this.borrar(); return; }
      if (!await this.tiempo.permiteRegresoPorTiempo()) {
        await this.borrar('La sesión terminó. Inicia sesión nuevamente.');
        return;
      }
      await this.renovar(version);
    } catch {
      this.autorizada = false;
      if (version === this.generacion) this.publicar('error', 'No se pudo recuperar la sesión. Reintenta o cierra sesión.');
    }
  }

  private async renovar(version: number) {
    if (!this.token || version !== this.generacion) return;
    const actividad = this.actividadVersion;
    try {
      const nuevo = await this.renovacion.renovar(this.token);
      if (version !== this.generacion) return;
      await this.tokens.guardar(nuevo);
      this.token = nuevo;
      this.autorizada = true;
      this.ultimaRenovacion = this.ahora();
      if (this.activa && actividad === this.actividadVersion && version === this.generacion) {
        await this.salida.guardar(this.ahora());
        if (this.activa && actividad === this.actividadVersion && version === this.generacion) this.publicar('activa');
      }
    } catch (error: unknown) {
      if (version !== this.generacion) return;
      const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
      if (status === 401) {
        await this.borrar('La sesión venció o dejó de ser válida. Inicia sesión nuevamente.');
      } else {
        this.autorizada = false;
        // Red/5xx/403 no demuestran expiración: bloqueamos acceso sin borrar credenciales.
        this.publicar('error', 'No se pudo verificar la sesión. Reintenta o cierra sesión.');
      }
    }
  }

  cambiarActividad(activa: boolean): Promise<void> {
    if (activa === this.activa) return Promise.resolve();
    this.activa = activa;
    this.actividadVersion += 1;
    const instante = this.ahora();
    if (!activa) {
      this.ultimaSalida = instante;
      if (this.estado.fase === 'activa') this.publicar('verificando');
    }
    return this.ejecutar(async () => {
      if (!activa) {
        if (this.token && this.autorizada) {
          try { await this.salida.guardar(instante); }
          catch { this.publicar('error', 'No se pudo registrar la salida. Cierra sesión para proteger el acceso.'); }
        }
      } else {
        await this.comprobarRegreso();
      }
    });
  }

  mantenerActiva(): Promise<void> {
    if (this.manteniendo || !this.activa || this.estado.fase !== 'activa') return Promise.resolve();
    this.manteniendo = true;
    return this.ejecutar(async () => {
      if (!this.activa || !this.token || this.estado.fase !== 'activa') return;
      try {
        if (this.ahora() - this.ultimaRenovacion >= 60000) await this.renovar(this.generacion);
        else await this.salida.guardar(this.ahora());
      } catch { this.publicar('error', 'No se pudo mantener la sesión. Reintenta o cierra sesión.'); }
    }).finally(() => { this.manteniendo = false; });
  }

  cerrar(): Promise<void> {
    // Invalida inmediatamente el resultado de cualquier renovación en curso.
    this.generacion += 1;
    this.cierrePendiente = true;
    this.autorizada = false;
    this.publicar('verificando');
    return this.ejecutar(() => this.borrar());
  }
}
