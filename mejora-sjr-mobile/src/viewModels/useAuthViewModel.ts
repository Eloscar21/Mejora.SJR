/**
 * useAuthViewModel.ts
 * ViewModel para el módulo de Autenticación Móvil (US-003).
 * 
 * Principios aplicados:
 * - MVVM: Separa la lógica de autenticación y validación de la capa de presentación (AuthView).
 * - SRP: Valida campos con señalización en rojo, interactúa con IAuthService y decodifica el JWT para dirigir el flujo según el rol.
 * - DIP: Inyecta el contexto de autenticación y la abstracción IAuthService.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../providers/AuthProvider';

export interface FormErrors {
  nombre?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function useAuthViewModel() {
  const { authService, establecerSesion, roleWarning, setRoleWarning } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Limpiar error específico al escribir
  const clearError = (field: keyof FormErrors) => {
    if (errors[field] || errors.general) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next.general;
        return next;
      });
    }
    setRoleWarning(null);
  };

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    clearError('email');
  }, [errors]);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    clearError('password');
  }, [errors]);

  const handleNombreChange = useCallback((text: string) => {
    setNombre(text);
    clearError('nombre');
  }, [errors]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    clearError('confirmPassword');
  }, [errors]);

  const switchMode = useCallback((mode: 'login' | 'registro') => {
    setAuthMode(mode);
    setErrors({});
    setRoleWarning(null);
  }, []);

  // Validación Visual Estricta (US-003: "validación visual (rojo en error)")
  const validarLogin = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido.';
    } else if (!email.includes('@') || !email.includes('.')) {
      newErrors.email = 'Formato de correo no válido (ej. usuario@dominio.com).';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida.';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validarRegistro = (): boolean => {
    const newErrors: FormErrors = {};

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre completo es requerido.';
    } else if (nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe contener al menos 3 caracteres.';
    }

    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido.';
    } else if (!email.includes('@') || !email.includes('.')) {
      newErrors.email = 'Formato de correo no válido.';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida.';
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Debes confirmar tu contraseña.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Proceso de Inicio de Sesión y Decodificación de JWT (US-003)
  const handleLogin = useCallback(async () => {
    if (!validarLogin()) return;

    setIsLoading(true);
    setErrors({});
    setRoleWarning(null);

    try {
      const response = await authService.login({ email, password });
      const token = response.data.token;
      const session = response.data.usuario;

      // El proveedor aplica la misma política de roles que en la restauración.
      await establecerSesion(token, session);
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Error al iniciar sesión. Verifica tus credenciales.',
        email: ' ', // Activa borde rojo visual en input de email
        password: ' ', // Activa borde rojo visual en input de password
      });
    } finally {
      setIsLoading(false);
    }
  }, [email, password, authService, establecerSesion]);

  // Proceso de Registro de Ciudadano (US-003)
  const handleRegistro = useCallback(async () => {
    if (!validarRegistro()) return;

    setIsLoading(true);
    setErrors({});
    setRoleWarning(null);

    try {
      const response = await authService.registro({
        nombre,
        email,
        password,
      });

      const token = response.data.token;
      const session = response.data.usuario;

      // El registro ciudadano siempre asigna Rol 1 -> Va a "Crear Reporte"
      await establecerSesion(token, session);
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Error al registrar la cuenta.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [nombre, email, password, confirmPassword, authService, establecerSesion]);

  // Autocompletar cuentas de prueba con un toque
  const setQuickEmail = useCallback((testEmail: string) => {
    setEmail(testEmail);
    setPassword('Password123!');
    setErrors({});
    setRoleWarning(null);
  }, []);

  return {
    authMode,
    nombre,
    email,
    password,
    confirmPassword,
    isLoading,
    errors,
    roleWarning,
    switchMode,
    handleNombreChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleLogin,
    handleRegistro,
    setQuickEmail,
  };
}
