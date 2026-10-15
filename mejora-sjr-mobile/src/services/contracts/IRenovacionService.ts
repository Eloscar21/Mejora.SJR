/** Solo renueva tokens aún aceptados por el servidor. */
export interface IRenovacionService {
  renovar(token: string): Promise<string>;
}
