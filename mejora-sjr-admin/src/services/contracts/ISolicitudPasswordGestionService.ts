import type {
  AprobarSolicitudPasswordDTO,
  RechazarSolicitudPasswordDTO,
  SolicitudPasswordAprobada,
  SolicitudPasswordRechazada,
} from '../../models/password.types';

export interface ISolicitudPasswordGestionService {
  aprobarSolicitud(idSolicitud: number, datos?: AprobarSolicitudPasswordDTO): Promise<SolicitudPasswordAprobada>;
  rechazarSolicitud(idSolicitud: number, datos: RechazarSolicitudPasswordDTO): Promise<SolicitudPasswordRechazada>;
}
