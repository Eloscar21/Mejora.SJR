/**
 * Estructuras de datos para el flujo de Registro de Ciudadano (US-003).
 *
 * Mapeo SOLID:
 * - (S - Single Responsibility): Define exclusivamente las estructuras de datos y contratos de tipos.
 * - (I - Interface Segregation): Separa el estado que vive en el formulario móvil del payload real que viaja a la red.
 */

/**
 * Representa los campos que el ciudadano llena en la pantalla.
 * 'confirmarPassword' solo vive localmente para validación de coincidencia.
 */
export interface FormularioRegistroState {
  nombre: string;
  email: string;
  password: string;
  confirmarPassword: string;
}

/**
 * Errores de validación que el ViewModel calcula y entrega a la Vista.
 * La Vista solo lee este objeto para pintar mensajes debajo de cada input.
 */
export interface ErroresRegistro {
  nombre?: string;
  email?: string;
  password?: string;
  confirmarPassword?: string;
  general?: string;
}

/**
 * Contrato de datos que viaja por la red hacia el Backend (POST /api/auth/registro).
 * Cumple con 'Cero Confianza' y no expone campos innecesarios como confirmarPassword.
 */
export interface DatosRegistroCiudadano {
  nombre: string;
  email: string;
  password: string;
}

/**
 * Respuesta exitosa que entrega el servidor tras crear la cuenta.
 */
export interface RespuestaRegistro {
  mensaje: string;
}
