import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../providers/AuthProvider';
import { resolveMobileNavigation } from './navigationPolicy';

/** Deriva el destino de la sesión y conserva la comprobación de US-018 al volver al primer plano. */
export function useNavigationViewModel() {
  const {
    isRestoringSession, sessionCloseStatus, sessionCloseError, token, session, decodedToken,
    authService, cerrarSesion, setRoleWarning,
  } = useAuth();

  const navigation = resolveMobileNavigation({
    isRestoringSession, sessionCloseStatus, token, session, decodedToken,
  });

  useEffect(() => {
    if (isRestoringSession || sessionCloseStatus !== 'idle' || navigation.destination === 'auth') return;
    let active = true;
    let checking = false;

    const verificarSesion = async () => {
      if (checking) return;
      checking = true;
      try {
        const valid = navigation.destination !== 'closing' && token
          ? await authService.validarTokenActivo(token)
          : false;
        if (!active) return;
        if (!valid) {
          setRoleWarning('Tu sesión ha expirado. Por favor, ingresa tus credenciales nuevamente.');
          await cerrarSesion();
        }
      } catch {
        if (active) setRoleWarning('No se pudo comprobar o cerrar la sesión. Intenta de nuevo.');
      } finally {
        checking = false;
      }
    };

    void verificarSesion();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void verificarSesion();
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [isRestoringSession, sessionCloseStatus, token, session, navigation.destination, authService, cerrarSesion, setRoleWarning]);

  const reintentarCierre = useCallback(() => {
    // El proveedor conserva el error para la vista de cierre si vuelve a fallar.
    void cerrarSesion().catch(() => undefined);
  }, [cerrarSesion]);

  return { ...navigation, sessionCloseStatus, sessionCloseError, reintentarCierre };
}
