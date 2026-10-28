'use client';

import { useEffect, useRef, useState } from 'react';
import type { Empleado } from '../models/empleado.types';
import type { IEmpleadoGestionService } from '../services/contracts/IEmpleadoGestionService';

/** Abrir esta instancia no ejecuta la baja; solo confirmar llama al servicio. */
export function useDesactivarEmpleadoViewModel(
  empleado: Empleado,
  gestion: Pick<IEmpleadoGestionService, 'desactivarEmpleado'>,
  onDesactivado?: (idUsuario: number) => void
) {
  const [seleccionado] = useState(() => ({
    idUsuario: empleado.idUsuario,
    nombre: empleado.nombre,
    email: empleado.email,
    activo: empleado.activo,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [desactivado, setDesactivado] = useState(false);
  const envioEnCurso = useRef(false);
  const bajaTerminada = useRef(false);
  const bajaNotificada = useRef(false);
  const montado = useRef(false);
  const errorEmpleado = !Number.isSafeInteger(seleccionado.idUsuario) || seleccionado.idUsuario <= 0
    ? 'El identificador del empleado no es válido.'
    : !seleccionado.activo ? 'El empleado ya está inactivo.' : null;

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  useEffect(() => {
    if (desactivado && onDesactivado && !bajaNotificada.current) {
      bajaNotificada.current = true;
      onDesactivado(seleccionado.idUsuario);
    }
  }, [desactivado, onDesactivado, seleccionado.idUsuario]);

  const puedeConfirmar = !errorEmpleado && !isSubmitting && !desactivado;

  async function confirmar(): Promise<boolean> {
    if (!montado.current || envioEnCurso.current || bajaTerminada.current || errorEmpleado) return false;
    envioEnCurso.current = true;
    setIsSubmitting(true);
    setErrorEnvio(null);
    try {
      await gestion.desactivarEmpleado(seleccionado.idUsuario);
      if (!montado.current) return false;
      bajaTerminada.current = true;
      setDesactivado(true);
      return true;
    } catch (error: unknown) {
      if (montado.current) {
        setErrorEnvio(error instanceof Error ? error.message : 'No se pudo desactivar al empleado.');
      }
      return false;
    } finally {
      envioEnCurso.current = false;
      if (montado.current) setIsSubmitting(false);
    }
  }

  return {
    idUsuario: seleccionado.idUsuario, nombre: seleccionado.nombre, email: seleccionado.email,
    isSubmitting, errorEmpleado, errorEnvio, desactivado, puedeConfirmar, confirmar,
  };
}
