/**
 * useSolicitarRecuperacionViewModel.ts
 * ViewModel MVVM para el modal de solicitud de recuperación asistida de contraseña.
 * Cumple SRP y DIP: recibe ISolicitudRecuperacionService por inyección de dependencias.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ISolicitudRecuperacionService } from '../services/contracts/ISolicitudRecuperacionService';

export function useSolicitarRecuperacionViewModel(
  service: ISolicitudRecuperacionService,
  emailInicial = '',
  isOpen = false
) {
  const [email, setEmail] = useState(emailInicial);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(emailInicial);
      setError(null);
      setMensajeExito(null);
    }
  }, [isOpen, emailInicial]);

  const enviarSolicitud = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un correo electrónico institucional válido.');
      return;
    }

    setCargando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const resultado = await service.solicitarRecuperacion(email);
      setMensajeExito(resultado.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  }, [email, service]);

  const limpiarEstado = useCallback(() => {
    setError(null);
    setMensajeExito(null);
  }, []);

  return {
    email,
    setEmail,
    cargando,
    mensajeExito,
    error,
    enviarSolicitud,
    limpiarEstado,
  };
}
