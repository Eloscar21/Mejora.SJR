'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthApiService } from '../services/api/AuthApiService';
import { MockAuthService } from '../services/mocks/MockAuthService';
import { useLoginViewModel } from '../viewModels/useLoginViewModel';
import { LoginView } from '../views/auth/LoginView';

/** La demo es una selección explícita de composición, nunca una respuesta a un fallo HTTP. */
export function LoginProvider() {
  const router = useRouter();
  const params = useSearchParams();
  const modoDemostracion = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  const servicio = useMemo(() => modoDemostracion ? new MockAuthService() : new AuthApiService(), [modoDemostracion]);
  const onAutenticado = useCallback(() => { router.push('/dashboard'); }, [router]);
  const vm = useLoginViewModel(servicio, onAutenticado, params.get('error'));
  return <LoginView viewModel={vm} modoDemostracion={modoDemostracion} />;
}
