/**
 * MockPerfilService.ts
 * Implementación en memoria de IPerfilService para el apartado "Mis Datos" en modo autónomo y pruebas (US-032).
 * Cumple con el Principio de Sustitución de Liskov (LSP).
 */

import { ROLES_SJR, type TipoRol, type UsuarioSession } from '../../models/auth.types';
import type {
  ActualizarPerfilDTO,
  ActualizarPerfilResultado,
  PerfilCiudadano,
} from '../../models/perfil.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { IPerfilService } from '../contracts/IPerfilService';
import type { IStorageService } from '../contracts/IStorageService';
import { defaultStorageService } from '../storage/StorageService';

const STORAGE_USER_KEY = '@mejora_sjr_mobile_user';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class MockPerfilService implements IPerfilService {
  private perfilActual: PerfilCiudadano;
  private passwordActualSimulada = 'Password123!';

  constructor(
    private readonly authService?: Pick<IAuthService, 'obtenerUsuario'>,
    private readonly storage: IStorageService = defaultStorageService,
    semilla?: Partial<PerfilCiudadano>
  ) {
    this.perfilActual = {
      idUsuario: semilla?.idUsuario ?? 1,
      nombre: semilla?.nombre ?? 'Ciudadano Juan',
      email: semilla?.email ?? 'ciudadano@test.com',
      idRol: semilla?.idRol ?? 1,
      rolNombre: semilla?.rolNombre ?? 'Ciudadano',
      idDepartamento: semilla?.idDepartamento ?? null,
      activo: semilla?.activo ?? true,
      resumenReportes: semilla?.resumenReportes ?? {
        total: 3,
        recibidos: 1,
        enProceso: 1,
        resueltos: 1,
      },
    };
  }

  async obtenerPerfil(): Promise<PerfilCiudadano> {
    if (this.authService) {
      const sesion = await this.authService.obtenerUsuario();
      if (sesion) {
        const rolKey = (sesion.idRol in ROLES_SJR ? sesion.idRol : 1) as TipoRol;
        this.perfilActual = {
          ...this.perfilActual,
          idUsuario: sesion.idUsuario,
          nombre: sesion.nombre,
          email: sesion.email,
          idRol: sesion.idRol,
          rolNombre: ROLES_SJR[rolKey],
          idDepartamento: sesion.idDepartamento,
        };
      }
    }
    return {
      ...this.perfilActual,
      resumenReportes: { ...this.perfilActual.resumenReportes },
    };
  }

  async actualizarPerfil(dto: ActualizarPerfilDTO): Promise<ActualizarPerfilResultado> {
    const nombreLimpio = (dto.nombre || '').trim().replace(/\s+/g, ' ');
    if (nombreLimpio.length < 3 || nombreLimpio.length > 150) {
      throw new Error('El nombre completo debe tener entre 3 y 150 caracteres.');
    }

    const emailLimpio = (dto.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailLimpio)) {
      throw new Error('El formato del correo electrónico no es válido.');
    }

    const solicitaPassword =
      Boolean(dto.passwordNueva) ||
      Boolean(dto.confirmarPassword) ||
      Boolean(dto.passwordActual);

    if (solicitaPassword) {
      if (!dto.passwordActual || !dto.passwordNueva || !dto.confirmarPassword) {
        throw new Error(
          'Para actualizar tu contraseña debes completar la contraseña actual, la nueva y su confirmación.'
        );
      }
      if (dto.passwordActual !== this.passwordActualSimulada) {
        throw new Error('La contraseña actual es incorrecta.');
      }
      if (dto.passwordNueva.length < 8) {
        throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
      }
      if (dto.passwordNueva !== dto.confirmarPassword) {
        throw new Error('La confirmación no coincide con la nueva contraseña.');
      }
      if (dto.passwordNueva === dto.passwordActual) {
        throw new Error('La nueva contraseña debe ser diferente de la actual.');
      }
      this.passwordActualSimulada = dto.passwordNueva;
    }

    this.perfilActual = {
      ...this.perfilActual,
      nombre: nombreLimpio,
      email: emailLimpio,
    };

    const nuevaSesion: UsuarioSession = {
      idUsuario: this.perfilActual.idUsuario,
      nombre: this.perfilActual.nombre,
      email: this.perfilActual.email,
      idRol: this.perfilActual.idRol,
      idDepartamento: this.perfilActual.idDepartamento,
    };
    await this.storage.setItem(STORAGE_USER_KEY, JSON.stringify(nuevaSesion));

    return {
      usuario: {
        ...this.perfilActual,
        resumenReportes: { ...this.perfilActual.resumenReportes },
      },
      mensaje: solicitaPassword
        ? 'Tus datos personales y contraseña se actualizaron correctamente.'
        : 'Tus datos personales se actualizaron correctamente.',
    };
  }
}
