import type { NavigationDecision, NavigationSessionState } from '../models/navigation.types';

/** Política local de presentación; no verifica la firma ni autoriza peticiones HTTP. */
export function resolveMobileNavigation(
  state: NavigationSessionState,
  nowMilliseconds: number = Date.now()
): NavigationDecision {
  if (state.isRestoringSession) return { destination: 'splash', sessionKey: 'restoring' };
  if (state.sessionCloseStatus !== 'idle') return { destination: 'closing', sessionKey: 'closing' };

  const { token, session, decodedToken } = state;
  if (token === null && session === null && decodedToken === null) {
    return { destination: 'auth', sessionKey: 'public' };
  }
  const exp = decodedToken?.exp;
  if (!token?.trim() || !session || !decodedToken ||
    typeof exp !== 'number' || !Number.isFinite(exp) || exp <= nowMilliseconds / 1000 ||
    decodedToken.idRol !== session.idRol) {
    // Hay credenciales previas: primero deben limpiarse, sin montar Login en esa espera.
    return { destination: 'closing', sessionKey: 'closing' };
  }

  if (decodedToken.idRol === 1) {
    return { destination: 'citizen', sessionKey: `citizen-${session.idUsuario}` };
  }
  if (decodedToken.idRol === 2) {
    return { destination: 'worker', sessionKey: `worker-${session.idUsuario}` };
  }
  return { destination: 'closing', sessionKey: 'closing' };
}
