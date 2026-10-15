import type { CredencialesLogin, RespuestaLoginMovil } from '../../models/Login';

/** Autentica; no almacena tokens ni controla la navegación de la aplicación. */
export interface ILoginService {
  /**
   * Devuelve el resultado del login o rechaza la promesa si falla.
   * El adaptador HTTP añadirá canal: 'movil' y validará la respuesta recibida.
   * El contrato TypeScript por sí solo no valida datos provenientes de la red.
   */
  login(credenciales: CredencialesLogin): Promise<RespuestaLoginMovil>;
}
