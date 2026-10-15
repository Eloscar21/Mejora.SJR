/**
 * Implementación de producción del servicio de autenticación hacia la API real.
 *
 * Mapeo SOLID:
 * - (S - Single Responsibility): Su única responsabilidad es comunicarse vía HTTP
 *   con el endpoint '/api/auth/registro' del Backend de Mejora SJR.
 * - (L - Liskov Substitution): Implementa IAuthService, lo que permite intercambiarlo
 *   por MockAuthService sin alterar los ViewModels.
 */

import { IAuthService } from '../contracts/IAuthService';
import { DatosRegistroCiudadano, RespuestaRegistro } from '../../models/Registro';

export class AuthApiService implements IAuthService {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async registrarCiudadano(datos: DatosRegistroCiudadano): Promise<RespuestaRegistro> {
    const url = `${this.baseUrl}/api/auth/registro`;

    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
      });
    } catch {
      throw new Error('No se pudo establecer conexión con el servidor municipal. Verifica tu red.');
    }

    const payload = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      // El backend devuelve { mensaje: '...' } según errorHandler.js
      const mensajeError = payload.mensaje || 'Ocurrió un error inesperado al registrar la cuenta.';
      throw new Error(mensajeError);
    }

    return {
      mensaje: payload.mensaje || 'Ciudadano registrado exitosamente'
    };
  }
}
