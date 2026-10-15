/** Credenciales introducidas por el usuario; el rol lo determina el servidor. */
export interface CredencialesLogin {
  email: string;
  password: string;
}

/** Mensajes que la vista muestra sin calcular reglas de validación. */
export interface ErroresLogin {
  email?: string;
  password?: string;
  general?: string;
}

/** Payload HTTP que construirá el adaptador móvil, no la vista. */
export interface SolicitudLoginMovil extends CredencialesLogin {
  canal: 'movil';
}

/** Respuesta del backend para un login con canal móvil. */
export interface RespuestaLoginMovil {
  mensaje: string;
  token: string;
}
