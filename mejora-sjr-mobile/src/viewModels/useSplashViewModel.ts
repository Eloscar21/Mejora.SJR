import { useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';

/** Coordina el arranque; el servicio obtiene los datos y el proveedor restaura la sesión. */
export function useSplashViewModel() {
  const { authService, establecerSesion, setCurrentScreen } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const verificarSesionInicial = async () => {
      try {
        const token = await authService.obtenerToken();
        const session = await authService.obtenerUsuario();

        // Conserva la espera visual del splash existente.
        await new Promise((resolve) => setTimeout(resolve, 1400));

        if (!isMounted) return;

        if (token) {
          const decoded = authService.decodificarToken(token);
          const exp = decoded?.exp;
          // exp usa segundos; un payload ilegible o sin vencimiento válido
          // tampoco permite restaurar la sesión local.
          if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= Date.now() / 1000) {
            await authService.logout();
            if (isMounted) setCurrentScreen('auth');
            return;
          }
        }

        if (token && session) {
          await establecerSesion(token, session);
        } else {
          setCurrentScreen('auth');
        }
      } catch {
        if (isMounted) setCurrentScreen('auth');
      }
    };

    verificarSesionInicial();

    return () => {
      isMounted = false;
    };
  }, [authService, establecerSesion, setCurrentScreen]);

  const continuarAlInicio = () => setCurrentScreen('auth');

  return { continuarAlInicio };
}
