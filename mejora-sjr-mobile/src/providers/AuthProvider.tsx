/**
 * AuthProvider.tsx
 * Contenedor de Inversión de Control (IoC) y Contexto de Autenticación para la aplicación móvil.
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Inyecta abstracciones IAuthService, ICatalogoService, IStorageService.
 * - SRP: Mantiene la sesión y construye las dependencias; el navegador deriva sus rutas.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { IAuthService } from '../services/contracts/IAuthService';
import { ICatalogoService } from '../services/contracts/ICatalogoService';
import { IStorageService } from '../services/contracts/IStorageService';
import { MockAuthService } from '../services/mocks/MockAuthService';
import { AuthApiService } from '../services/api/AuthApiService';
import { MockCatalogoService } from '../services/mocks/MockCatalogoService';
import { CatalogoApiService } from '../services/api/CatalogoApiService';
import { defaultStorageService } from '../services/storage/StorageService';
import { UsuarioSession, DecodedToken, SessionCloseStatus } from '../models/auth.types';

interface AuthContextType {
  session: UsuarioSession | null;
  token: string | null;
  decodedToken: DecodedToken | null;
  isRestoringSession: boolean;
  sessionCloseStatus: SessionCloseStatus;
  sessionCloseError: string | null;
  authService: IAuthService;
  catalogoService: ICatalogoService;
  storageService: IStorageService;
  finalizarRestauracion: () => void;
  establecerSesion: (token: string, session: UsuarioSession) => Promise<void>;
  roleWarning: string | null;
  setRoleWarning: (message: string | null) => void;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  authService?: IAuthService;
  catalogoService?: ICatalogoService;
  storageService?: IStorageService;
  useMock?: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  authService: customAuthService,
  catalogoService: customCatalogoService,
  storageService: customStorageService = defaultStorageService,
  useMock = true, // Por defecto en mock para desarrollo móvil autónomo
}) => {
  const [session, setSession] = useState<UsuarioSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [decodedToken, setDecodedToken] = useState<DecodedToken | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [sessionCloseStatus, setSessionCloseStatus] = useState<SessionCloseStatus>('idle');
  const [sessionCloseError, setSessionCloseError] = useState<string | null>(null);
  const closeStatusRef = useRef<SessionCloseStatus>('idle');
  const closeOperationRef = useRef<Promise<void> | null>(null);
  const [roleWarning, setRoleWarning] = useState<string | null>(null);

  // Inicialización de servicios desacoplados
  const authService = useMemo<IAuthService>(() => {
    if (customAuthService) return customAuthService;
    return useMock ? new MockAuthService(customStorageService) : new AuthApiService(undefined, customStorageService);
  }, [customAuthService, customStorageService, useMock]);

  const catalogoService = useMemo<ICatalogoService>(() => {
    if (customCatalogoService) return customCatalogoService;
    return useMock ? new MockCatalogoService() : new CatalogoApiService();
  }, [customCatalogoService, useMock]);

  const storageService = useMemo<IStorageService>(() => {
    return customStorageService;
  }, [customStorageService]);

  // Una sola operación de cierre. Login no se habilita hasta terminar el borrado y la limpieza local.
  const cerrarSesion = useCallback((): Promise<void> => {
    if (closeOperationRef.current) return closeOperationRef.current;

    closeStatusRef.current = 'pending';
    setSessionCloseStatus('pending');
    setSessionCloseError(null);
    let closed = false;

    const operation = Promise.resolve()
      .then(() => authService.logout())
      .then(() => {
        setSession(null);
        setToken(null);
        setDecodedToken(null);
        closed = true;
      })
      .catch((error: unknown) => {
        closeStatusRef.current = 'failed';
        setSessionCloseStatus('failed');
        setSessionCloseError('No se pudo eliminar la sesión guardada. Reintenta para continuar.');
        throw error;
      })
      .finally(() => {
        closeOperationRef.current = null;
        if (closed) {
          closeStatusRef.current = 'idle';
          setSessionCloseStatus('idle');
        }
      });

    closeOperationRef.current = operation;
    return operation;
  }, [authService]);

  // Una sola política de admisión para login, registro y restauración.
  const establecerSesion = useCallback(async (nuevoToken: string, nuevaSesion: UsuarioSession) => {
    if (closeStatusRef.current !== 'idle' || closeOperationRef.current) {
      throw new Error('Espera a que termine el cierre de la sesión anterior.');
    }
    const decoded = authService.decodificarToken(nuevoToken);
    const rol = decoded?.idRol;
    const rolCoincide = rol === nuevaSesion?.idRol;

    if (!rolCoincide || (rol !== 1 && rol !== 2)) {
      const message = rolCoincide && (rol === 3 || rol === 4)
        ? 'Accede desde el panel web.'
        : 'Perfil no admitido.';
      setRoleWarning(message);
      try {
        await cerrarSesion();
      } catch {
        // La fase failed mantiene bloqueados el login y las rutas privadas.
        setRoleWarning(`${message} No se pudo eliminar la sesión guardada. Intenta de nuevo.`);
      }
      return;
    }

    setRoleWarning(null);
    setToken(nuevoToken);
    setSession(nuevaSesion);
    setDecodedToken(decoded);
  }, [authService, cerrarSesion]);

  const finalizarRestauracion = useCallback(() => setIsRestoringSession(false), []);

  return (
    <AuthContext.Provider
      value={{
        session,
        token,
        decodedToken,
        isRestoringSession,
        sessionCloseStatus,
        sessionCloseError,
        authService,
        catalogoService,
        storageService,
        finalizarRestauracion,
        establecerSesion,
        roleWarning,
        setRoleWarning,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
