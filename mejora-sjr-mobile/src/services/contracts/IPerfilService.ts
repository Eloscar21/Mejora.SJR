/**
 * IPerfilService.ts
 * Contrato abstracto para la consulta y actualización de "Mis Datos" / Perfil Ciudadano (US-032).
 * Cumple con el Principio de Inversión de Dependencias (DIP).
 */

import type {
  ActualizarPerfilDTO,
  ActualizarPerfilResultado,
  PerfilCiudadano,
} from '../../models/perfil.types';

export interface IPerfilService {
  /** Obtiene los datos actuales del ciudadano autenticado y su resumen de participación. */
  obtenerPerfil(): Promise<PerfilCiudadano>;

  /** Actualiza los datos personales (nombre, correo) y opcionalmente la contraseña del ciudadano. */
  actualizarPerfil(dto: ActualizarPerfilDTO): Promise<ActualizarPerfilResultado>;
}
