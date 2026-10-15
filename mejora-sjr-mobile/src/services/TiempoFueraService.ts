import type { ISalidaStorage } from './contracts/ISalidaStorage';

const LIMITE_FUERA_MS = 5 * 60 * 1000;

/** Evalúa únicamente el tiempo fuera: no autentica ni modifica la validez del JWT. */
export class TiempoFueraService {
  private readonly salidaStorage: ISalidaStorage;
  private readonly ahora: () => number;

  constructor(salidaStorage: ISalidaStorage, ahora: () => number = Date.now) {
    this.salidaStorage = salidaStorage;
    this.ahora = ahora;
  }

  async registrarSalida(): Promise<void> {
    const instante = this.ahora();
    // Conserva la primera salida: eventos repetidos no reinician los cinco minutos.
    if (await this.salidaStorage.leer() === null) {
      await this.salidaStorage.guardar(instante);
    }
  }

  async permiteRegresoPorTiempo(): Promise<boolean> {
    const salida = await this.salidaStorage.leer();
    const instante = this.ahora();
    if (salida === null || !Number.isSafeInteger(salida) || salida < 0
      || !Number.isSafeInteger(instante) || instante < salida) return false;
    return instante - salida < LIMITE_FUERA_MS;
  }

  /** Solo después de un regreso autorizado o al iniciar/cerrar una sesión. */
  async limpiarSalida(): Promise<void> {
    await this.salidaStorage.eliminar();
  }
}
