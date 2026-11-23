/**
 * useSolicitarRecuperacionViewModel.ts
 * ViewModel MVVM para SolicitarRecuperacionModal en la app móvil.
 * Cumple SRP y DIP: recibe ISolicitudRecuperacionService inyectado.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ISolicitudRecuperacionService } from '../services/contracts/ISolicitudRecuperacionService';

export function useSolicitarRecuperacionViewModel(
  service: ISolicitudRecuperacionService,
  initialEmail = '',
  visible = false
) {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [visible, initialEmail]);

  const handleSubmit = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const resultado = await service.solicitarRecuperacion(trimmed);
      setSuccessMessage(resultado.message);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error de conexión con el servidor municipal.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [email, service]);

  const resetMessages = useCallback(() => {
    setSuccessMessage(null);
    setErrorMessage(null);
  }, []);

  return {
    email,
    setEmail,
    isLoading,
    successMessage,
    errorMessage,
    setErrorMessage,
    handleSubmit,
    resetMessages,
  };
}
