/** Persistencia del token; no comprueba su validez ni controla la sesión. */
export interface ITokenStorage {
  guardar(token: string): Promise<void>;
  leer(): Promise<string | null>;
  eliminar(): Promise<void>;
}
