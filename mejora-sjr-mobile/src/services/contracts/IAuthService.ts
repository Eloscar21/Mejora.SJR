/**
 * Contrato de abstracción para servicios de autenticación y registro.
 *
 * Mapeo SOLID:
 * - (I - Interface Segregation): Contrato específico y mínimo; no obliga al ViewModel a depender de métodos que no usa.
 * - (D - Dependency Inversion): El ViewModel depende de esta interfaz abstracta, NO de axios, fetch ni implementaciones concretas.
 */

import { DatosRegistroCiudadano, RespuestaRegistro } from '../../models/Registro';

export interface IAuthService {
  /**
   * Envía la solicitud de registro de un nuevo ciudadano.
   * @param datos Objeto con nombre, email y password ya validados localmente.
   * @returns Promesa con la respuesta del servidor ({ mensaje: string }).
   * @throws Error de red o error de negocio (ej. 'El correo ya está registrado').
   */
  registrarCiudadano(datos: DatosRegistroCiudadano): Promise<RespuestaRegistro>;
}
