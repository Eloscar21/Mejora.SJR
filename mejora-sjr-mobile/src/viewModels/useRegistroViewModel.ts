/**
 * ViewModel para el registro de ciudadanos en la app móvil (US-003).
 *
 * Mapeo SOLID:
 * - (S - Single Responsibility): Controla exclusivamente el estado de la vista de registro
 *   y las reglas de validación en el cliente. No dibuja UI ni conoce detalles de HTTP.
 * - (O - Open/Closed): Abierto a recibir diferentes implementaciones de IAuthService
 *   sin modificar su lógica interna.
 * - (D - Dependency Inversion): Depende de la abstracción IAuthService, inyectada por parámetro.
 */

import { useState, useCallback } from 'react';
import { IAuthService } from '../services/contracts/IAuthService';
import { AuthApiService } from '../services/api/AuthApiService';
import {
  FormularioRegistroState,
  ErroresRegistro,
  RespuestaRegistro
} from '../models/Registro';

const EMAIL_FORMATO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;
const TEXTO_MAX = 150;

const ESTADO_INICIAL: FormularioRegistroState = {
  nombre: '',
  email: '',
  password: '',
  confirmarPassword: ''
};

export interface UseRegistroViewModelProps {
  authService?: IAuthService;
}

export function useRegistroViewModel({
  authService = new AuthApiService()
}: UseRegistroViewModelProps = {}) {
  const [formulario, setFormulario] = useState<FormularioRegistroState>(ESTADO_INICIAL);
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [mensajeExito, setMensajeExito] = useState<string>('');

  /**
   * Actualiza el valor de un campo específico y limpia su error asociado.
   */
  const cambiarCampo = useCallback((campo: keyof FormularioRegistroState, valor: string) => {
    setFormulario((prev: FormularioRegistroState) => ({ ...prev, [campo]: valor }));
    setErrores((prev: ErroresRegistro) => {
      if (!prev[campo] && !prev.general) return prev;
      const nuevos = { ...prev };
      delete nuevos[campo];
      delete nuevos.general;
      return nuevos;
    });
  }, []);

  /**
   * Ejecuta las validaciones locales del cliente.
   * Regla de Negocio: No consume la red si hay errores en el formulario.
   */
  const validarFormularioLocal = useCallback((): { esValido: boolean; erroresDetectados: ErroresRegistro } => {
    const nuevosErrores: ErroresRegistro = {};

    // 1. Validación de Nombre
    const nombreLimpio = formulario.nombre.trim();
    if (!nombreLimpio) {
      nuevosErrores.nombre = 'El nombre completo es obligatorio.';
    } else if (nombreLimpio.length > TEXTO_MAX) {
      nuevosErrores.nombre = `El nombre no puede superar ${TEXTO_MAX} caracteres.`;
    }

    // 2. Validación de Correo
    const emailLimpio = formulario.email.trim();
    if (!emailLimpio) {
      nuevosErrores.email = 'El correo electrónico es obligatorio.';
    } else if (emailLimpio.length > TEXTO_MAX) {
      nuevosErrores.email = `El correo no puede superar ${TEXTO_MAX} caracteres.`;
    } else if (!EMAIL_FORMATO_REGEX.test(emailLimpio)) {
      nuevosErrores.email = 'Ingresa un correo electrónico con formato válido (ej. usuario@dominio.com).';
    }

    // 3. Validación de Contraseña
    if (!formulario.password) {
      nuevosErrores.password = 'La contraseña es obligatoria.';
    } else if (formulario.password.length < PASSWORD_MIN || formulario.password.length > PASSWORD_MAX) {
      nuevosErrores.password = `La contraseña debe contener entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`;
    }

    // 4. Validación de Confirmación de Contraseña
    if (!formulario.confirmarPassword) {
      nuevosErrores.confirmarPassword = 'Debes confirmar tu contraseña.';
    } else if (formulario.password !== formulario.confirmarPassword) {
      nuevosErrores.confirmarPassword = 'Las contraseñas no coinciden.';
    }

    return {
      esValido: Object.keys(nuevosErrores).length === 0,
      erroresDetectados: nuevosErrores
    };
  }, [formulario]);

  /**
   * Procesa el envío del formulario.
   */
  const registrar = useCallback(async (): Promise<boolean> => {
    // 1. Validar localmente antes de gastar recursos de red (UX y eficiencia)
    const { esValido, erroresDetectados } = validarFormularioLocal();
    if (!esValido) {
      setErrores(erroresDetectados);
      return false;
    }

    // 2. Iniciar llamada al servicio inyectado
    setIsLoading(true);
    setErrores({});

    try {
      const respuesta: RespuestaRegistro = await authService.registrarCiudadano({
        nombre: formulario.nombre.trim(),
        email: formulario.email.trim().toLowerCase(),
        password: formulario.password
      });

      setIsSuccess(true);
      setMensajeExito(respuesta.mensaje);
      return true;
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido de conexión';
      setErrores({ general: mensaje });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [authService, formulario, validarFormularioLocal]);

  const reiniciarFormulario = useCallback(() => {
    setFormulario(ESTADO_INICIAL);
    setErrores({});
    setIsLoading(false);
    setIsSuccess(false);
    setMensajeExito('');
  }, []);

  return {
    formulario,
    errores,
    isLoading,
    isSuccess,
    mensajeExito,
    cambiarCampo,
    registrar,
    reiniciarFormulario
  };
}
