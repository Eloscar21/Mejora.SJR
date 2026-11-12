import type { EstadoSolicitudPassword, SolicitudPassword } from '../../models/password.types';

export interface ISolicitudPasswordConsultaService {
  listarSolicitudes(estado?: EstadoSolicitudPassword): Promise<SolicitudPassword[]>;
}
