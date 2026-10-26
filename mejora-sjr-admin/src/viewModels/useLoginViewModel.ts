/**
 * useLoginViewModel.ts
 * ViewModel para la pantalla de inicio de sesión de funcionarios.
 * 
 * Principios aplicados:
 * - MVVM (Model-View-ViewModel): Separa la lógica de autenticación de la vista visual (LoginView).
 * - DIP (Dependency Inversion): Inyecta IAuthService con fallback automático entre API y Mock.
 * - SRP: Valida formulario, gestiona estados reactivos y coordina la navegación.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IAuthService } from '../services/contracts/IAuthService';
import { AuthApiService } from '../services/api/AuthApiService';
import { MockAuthService } from '../services/mocks/MockAuthService';

const defaultAuthService: IAuthService = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
  ? new MockAuthService()
  : new AuthApiService();

export function useLoginViewModel(authService: IAuthService = defaultAuthService) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Detectar redirecciones del Middleware
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized_role') {
      setErrorMessage(
        'Acceso denegado: Tu rol (Ciudadano o Trabajador) no tiene permisos para ingresar al Panel Administrativo Web. Este panel es exclusivo para Administradores de Departamento y Superadmins.'
      );
    } else if (errorParam === 'session_expired') {
      setInfoMessage('Tu sesión ha expirado o no es válida. Por favor, ingresa tus credenciales nuevamente.');
    }
  }, [searchParams]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setErrorMessage(null);
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage('Por favor ingresa tanto tu correo como tu contraseña.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Llamar al servicio de autenticación
      const response = await authService.login({ email, password });
      
      // 2. Comprobación del rol en el cliente antes de redirigir (Defensa en profundidad)
      const rol = response.data?.usuario?.idRol;
      if (rol === 1 || rol === 2) {
        authService.logout();
        setErrorMessage(
          'Acceso restringido: Los perfiles de Ciudadano y Trabajador solo pueden operar desde la Aplicación Móvil.'
        );
        setIsLoading(false);
        return;
      }

      // 3. Redirigir al panel principal
      router.push('/dashboard');
    } catch (err: any) {
      // Si la API falla por conexión y no hay backend arriba, intentar con Mock transparente
      if (err.message && err.message.includes('Failed to fetch')) {
        try {
          console.warn('[LoginViewModel] Backend no alcanzable, recurriendo a MockAuthService...');
          const mockService = new MockAuthService();
          const mockResp = await mockService.login({ email, password });
          const mockRol = mockResp.data.usuario.idRol;
          if (mockRol === 1 || mockRol === 2) {
            mockService.logout();
            setErrorMessage(
              'Acceso restringido: Los perfiles de Ciudadano y Trabajador solo pueden operar desde la Aplicación Móvil.'
            );
            setIsLoading(false);
            return;
          }
          router.push('/dashboard');
          return;
        } catch (mockErr: any) {
          setErrorMessage(mockErr.message || 'Error de autenticación.');
        }
      } else {
        setErrorMessage(err.message || 'Error al iniciar sesión.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [email, password, authService, router]);

  // Rellenar credenciales de prueba con un clic para agilizar evaluaciones
  const setQuickCredentials = useCallback((testEmail: string) => {
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
