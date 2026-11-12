import type {
  AprobarSolicitudPasswordDTO,
  EstadoSolicitudPassword,
  RechazarSolicitudPasswordDTO,
  SolicitudPassword,
  SolicitudPasswordAprobada,
  SolicitudPasswordRechazada,
} from '../../models/password.types';
import type { IAuthService } from '../contracts/IAuthService';
import type { ISolicitudPasswordConsultaService } from '../contracts/ISolicitudPasswordConsultaService';
import type { ISolicitudPasswordGestionService } from '../contracts/ISolicitudPasswordGestionService';
import { PasswordApiError } from './PasswordApiError';
import { esIdPassword, esObjetoPassword, PasswordApiTransport } from './PasswordApiTransport';

function esEstado(value: unknown): value is EstadoSolicitudPassword {
  return value === 'PENDIENTE' || value === 'APROBADA' || value === 'RECHAZADA';
}

function esTexto(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function esFecha(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function normalizarSolicitud(value: unknown): SolicitudPassword {
  const invalida = () => new PasswordApiError('El servidor devolvió una solicitud de contraseña no válida.', 200);
  if (!esObjetoPassword(value)) throw invalida();
  const departamento = value.idDepartamento ?? null;
  const fechaResolucion = value.fechaResolucion ?? null;
  const resolutor = value.idSuperadminResolutor ?? null;
  const nombreResolutor = value.superadminNombre ?? null;
  const notas = value.notasResolucion ?? null;
  const nombreDepartamento = value.departamentoNombre ?? null;
  if (!esIdPassword(value.idSolicitud) || !esIdPassword(value.idUsuario) ||
      !esTexto(value.nombreUsuario) || !esTexto(value.email) ||
      !esIdPassword(value.idRol) || !esTexto(value.rolNombre) ||
      (departamento !== null && !esIdPassword(departamento)) ||
      (nombreDepartamento !== null && typeof nombreDepartamento !== 'string') ||
      !esEstado(value.estado) || !esFecha(value.fechaSolicitud) ||
      (fechaResolucion !== null && !esFecha(fechaResolucion)) ||
      (resolutor !== null && !esIdPassword(resolutor)) ||
      (nombreResolutor !== null && typeof nombreResolutor !== 'string') ||
      (notas !== null && typeof notas !== 'string')) throw invalida();

  // Solo datos previstos por la bandeja; no propaga hashes o claves que lleguen de más.
  return {
    idSolicitud: value.idSolicitud,
    idUsuario: value.idUsuario,
    nombreUsuario: value.nombreUsuario,
    email: value.email,
    idRol: value.idRol,
    rolNombre: value.rolNombre,
    idDepartamento: departamento,
    departamentoNombre: nombreDepartamento,
    estado: value.estado,
    fechaSolicitud: value.fechaSolicitud,
    fechaResolucion,
    idSuperadminResolutor: resolutor,
    superadminNombre: nombreResolutor,
    notasResolucion: notas,
  };
}

/** Un recurso HTTP implementa dos contratos pequeños; el consumidor recibe solo el que usa. */
export class SolicitudPasswordApiService implements ISolicitudPasswordConsultaService, ISolicitudPasswordGestionService {
  private readonly http: PasswordApiTransport;

  constructor(sesion: Pick<IAuthService, 'obtenerToken'>, baseUrl?: string, fetcher?: typeof fetch) {
    this.http = new PasswordApiTransport(sesion, baseUrl, fetcher);
  }

  async listarSolicitudes(estado: EstadoSolicitudPassword = 'PENDIENTE'): Promise<SolicitudPassword[]> {
    if (!esEstado(estado)) throw new PasswordApiError('El estado de solicitudes no es válido.', null);
    const body = await this.http.solicitar(`/solicitudes-password?estado=${estado}`, 'GET');
    if (!Array.isArray(body.data)) throw new PasswordApiError('El servidor no devolvió una lista de solicitudes.', 200);
    const solicitudes = body.data.map(normalizarSolicitud);
    if (new Set(solicitudes.map(s => s.idSolicitud)).size !== solicitudes.length || solicitudes.some(s => s.estado !== estado)) {
      throw new PasswordApiError('La lista de solicitudes no corresponde al filtro o contiene identificadores repetidos.', 200);
    }
    return solicitudes;
  }

  async aprobarSolicitud(idSolicitud: number, datos: AprobarSolicitudPasswordDTO = {}): Promise<SolicitudPasswordAprobada> {
    this.validarId(idSolicitud);
    const body = await this.http.solicitar(`/solicitudes-password/${idSolicitud}/aprobar`, 'PATCH', {
      ...(datos.notas !== undefined ? { notas: datos.notas } : {}),
    });
    const resultado = body.data;
    if (!esObjetoPassword(resultado) || resultado.idSolicitud !== idSolicitud || resultado.estado !== 'APROBADA' ||
        !esTexto(resultado.email) || typeof resultado.passwordTemporal !== 'string' ||
        !/^[A-Za-z0-9_-]{22}$/.test(resultado.passwordTemporal)) {
      throw new PasswordApiError('No se pudo verificar la clave temporal de la solicitud. Consulta su estado antes de continuar.', 200, true);
    }
    return { idSolicitud, estado: 'APROBADA', email: resultado.email, passwordTemporal: resultado.passwordTemporal };
  }

  async rechazarSolicitud(idSolicitud: number, datos: RechazarSolicitudPasswordDTO): Promise<SolicitudPasswordRechazada> {
    this.validarId(idSolicitud);
    const body = await this.http.solicitar(`/solicitudes-password/${idSolicitud}/rechazar`, 'PATCH', { motivo: datos.motivo });
    const resultado = body.data;
    if (!esObjetoPassword(resultado) || resultado.idSolicitud !== idSolicitud || resultado.estado !== 'RECHAZADA' ||
        !esTexto(resultado.motivo) || resultado.motivo !== datos.motivo.trim()) {
      throw new PasswordApiError('No se pudo verificar el rechazo de la solicitud. Consulta su estado antes de continuar.', 200, true);
    }
    return { idSolicitud, estado: 'RECHAZADA', motivo: resultado.motivo };
  }

  private validarId(idSolicitud: number): void {
    if (!esIdPassword(idSolicitud)) throw new PasswordApiError('El identificador de solicitud no es válido.', null);
  }
}
