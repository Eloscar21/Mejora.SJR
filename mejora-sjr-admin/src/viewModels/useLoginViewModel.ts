/**
 * useLoginViewModel.ts
 * ViewModel para la pantalla de inicio de sesión de funcionarios.
 * 
 * Principios aplicados:
 * - MVVM (Model-View-ViewModel): Separa la lógica de autenticación de la vista visual (LoginView).
 * - DIP: recibe IAuthService y navegación; la composición selecciona API o demo explícitamente.
 * - SRP: Valida formulario, gestiona estados reactivos y coordina la navegación.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent } from 'react';
import type { IAuthService } from '../services/contracts/IAuthService';

export function useLoginViewModel(
  authService: Pick<IAuthService, 'login' | 'logout'>,
  onAutenticado: () => void,
  motivo: string | null = null
) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const enviando = useRef(false);
  const autenticado = useRef(false);
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  // Detectar redirecciones del Middleware
  useEffect(() => {
    const errorParam = motivo;
    if (errorParam === 'unauthorized_role') {
      authService.logout();
      setErrorMessage(
        'Acceso denegado: Tu rol (Ciudadano o Trabajador) no tiene permisos para ingresar al Panel Administrativo Web. Este panel es exclusivo para Administradores de Departamento y Superadmins.'
      );
    } else if (errorParam === 'session_expired') {
      authService.logout();
      setInfoMessage('Tu sesión ha expirado o no es válida. Por favor, ingresa tus credenciales nuevamente.');
    }
  }, [motivo, authService]);

  const handleEmailChange = useCallback((value: string) => {
    if (enviando.current) return;
    setEmail(value);
    setErrorMessage(null);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    if (enviando.current) return;
    setPassword(value);
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!montado.current || enviando.current || autenticado.current) return;

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingresa tanto tu correo como tu contraseña.');
      return;
    }

    enviando.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Llamar al servicio de autenticación
      const respuesta = await authService.login({ email, password });
      if (!montado.current) return;
      if (respuesta.success !== true || typeof respuesta.data?.token !== 'string' || !respuesta.data.token.trim()) {
        throw new Error('El servidor no confirmó el inicio de sesión.');
      }

      // 2. Navegar hacia /dashboard: el Edge Route Guard (middleware.ts) valida la sesión
      //    y, si el perfil no cuenta con privilegios (Roles 1 o 2), lo intercepta y envía
      //    a la vista institucional corporativa 403 (/acceso-denegado) (US-015).
      setPassword('');
      autenticado.current = true;
      onAutenticado();
    } catch (err: unknown) {
      if (montado.current) setErrorMessage(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      enviando.current = false;
      if (montado.current) setIsLoading(false);
    }
  }, [email, password, authService, onAutenticado]);

  // Rellenar credenciales de prueba con un clic para agilizar evaluaciones
  const setQuickCredentials = useCallback((testEmail: string) => {
    if (enviando.current) return;
    setEmail(testEmail);
    setPassword('Password123!');
    setErrorMessage(null);
  }, []);

  return {
    email,
    password,
    isLoading,
    errorMessage,
    infoMessage,
    handleEmailChange,
    handlePasswordChange,
    handleSubmit,
    setQuickCredentials
  };
}
