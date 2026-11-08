import { useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';

/** Coordina el arranque; el servicio obtiene los datos y el proveedor restaura la sesión. */
export function useSplashViewModel() {
  const { authService, establecerSesion, cerrarSesion, finalizarRestauracion, setRoleWarning } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const verificarSesionInicial = async () => {
      try {
        const token = await authService.obtenerToken();
        const session = await authService.obtenerUsuario();

        // Conserva la espera visual del splash existente.
        await new Promise((resolve) => setTimeout(resolve, 1400));

        if (!isMounted) return;

        if (token && session) {
          const esValido = await authService.validarTokenActivo(token);
          if (!isMounted) return;
          if (!esValido) {
            await cerrarSesion();
            return;
          }
          await establecerSesion(token, session);
        } else if (token !== null || session !== null) {
          await cerrarSesion();
        }
      } catch {
        if (isMounted) setRoleWarning('No se pudo recuperar la sesión guardada. Inicia sesión de nuevo.');
      } finally {
        if (isMounted) finalizarRestauracion();
      }
    };

    verificarSesionInicial();

    return () => {
      isMounted = false;
    };
  }, [authService, establecerSesion, cerrarSesion, finalizarRestauracion, setRoleWarning]);
}
