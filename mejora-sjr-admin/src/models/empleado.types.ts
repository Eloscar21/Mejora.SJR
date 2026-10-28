/** Roles que pueden gestionarse desde los formularios de personal. */
export type RolEmpleado = 2 | 3;

/** Modelo del cliente; el adaptador normalizará activo a boolean. */
export interface Empleado {
  idUsuario: number;
  nombre: string;
  email: string;
  idRol: RolEmpleado;
  idDepartamento: number | null;
  activo: boolean;
  rolNombre?: string;
  departamentoNombre?: string | null;
}

/** Datos enviados al crear; el departamento es obligatorio para roles 2 y 3. */
export interface CrearEmpleadoDTO {
  nombre: string;
  email: string;
  password: string;
  idRol: RolEmpleado;
  idDepartamento: number;
}

/** La actualización actual no permite cambiar correo ni contraseña. */
export interface ActualizarEmpleadoDTO {
  nombre: string;
  idRol: RolEmpleado;
  idDepartamento: number;
}
