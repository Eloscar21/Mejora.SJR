import type { DecodedToken, SessionCloseStatus, UsuarioSession } from './auth.types';

export const MOBILE_ROUTES = {
  auth: { stack: 'AuthStack', screen: 'Login' },
  citizen: { stack: 'CitizenStack', screen: 'CrearReporte' },
  worker: { stack: 'WorkerStack', screen: 'BandejaTareas' },
} as const;

export type NavigationDestination = 'splash' | 'closing' | keyof typeof MOBILE_ROUTES;
export interface NavigationDecision {
  destination: NavigationDestination;
  sessionKey: string;
}

export interface NavigationSessionState {
  isRestoringSession: boolean;
  sessionCloseStatus: SessionCloseStatus;
  token: string | null;
  session: UsuarioSession | null;
  decodedToken: DecodedToken | null;
}

export type RootStackParamList = { AuthStack: undefined; CitizenStack: undefined; WorkerStack: undefined };
export type AuthStackParamList = { Login: undefined };
export type CitizenStackParamList = { CrearReporte: undefined };
export type WorkerStackParamList = { BandejaTareas: undefined };
