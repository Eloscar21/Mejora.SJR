/**
 * Implementación simulada (Mock) del servicio de autenticación.
 *
 * Mapeo SOLID:
 * - (L - Liskov Substitution): Puede sustituir a AuthApiService en cualquier lugar
 *   donde se espere un IAuthService sin romper la aplicación.
 * - (S - Single Responsibility): Su única responsabilidad es simular latencia de red
 *   y respuestas predecibles para pruebas locales y desarrollo offline.
 */

import { IAuthService } from '../contracts/IAuthService';
import { DatosRegistroCiudadano, RespuestaRegistro } from '../../models/Registro';

export class MockAuthService implements IAuthService {
  private readonly delayMs: number;
  private readonly simularError: boolean;

  constructor(delayMs = 800, simularError = false) {
    this.delayMs = delayMs;
    this.simularError = simularError;
  }

  async registrarCiudadano(datos: DatosRegistroCiudadano): Promise<RespuestaRegistro> {
    // Simula el tiempo que tarda la señal en viajar al servidor
    await new Promise<void>((resolve) => setTimeout(() => resolve(), this.delayMs));

    if (this.simularError) {
      throw new Error('Error simulado: El correo ya se encuentra registrado.');
    }

    if (datos.email.includes('duplicado')) {
      throw new Error('El correo electrónico ya está registrado en el sistema.');
    }

    return {
      mensaje: `Registro exitoso (MOCK): Bienvenido a Mejora SJR, ${datos.nombre}.`
    };
  }
}
