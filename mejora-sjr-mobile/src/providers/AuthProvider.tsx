/**
 * AuthProvider.tsx
 * Contenedor de Inversión de Control (IoC) y Contexto de Autenticación para la aplicación móvil.
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Inyecta abstracciones IAuthService, ICatalogoService, IStorageService.
 * - SRP: Mantiene el estado global de la sesión y coordina la navegación de nivel superior.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { IAuthService } from '../services/contracts/IAuthService';
import { ICatalogoService } from '../services/contracts/ICatalogoService';
import { IStorageService } from '../services/contracts/IStorageService';
import { MockAuthService } from '../services/mocks/MockAuthService';
import { AuthApiService } from '../services/api/AuthApiService';
import { MockCatalogoService } from '../services/mocks/MockCatalogoService';
import { CatalogoApiService } from '../services/api/CatalogoApiService';
import { defaultStorageService } from '../services/storage/StorageService';
import { UsuarioSession, DecodedToken } from '../models/auth.types';

export type ScreenName = 'splash' | 'auth' | 'crearReporte' | 'bandejaOrdenes';

interface AuthContextType {
  session: UsuarioSession | null;
  token: string | null;
  decodedToken: DecodedToken | null;
  isLoading: boolean;
  currentScreen: ScreenName;
  authService: IAuthService;
  catalogoService: ICatalogoService;
  storageService: IStorageService;
  setCurrentScreen: (screen: ScreenName) => void;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('splash');
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

  // Una sola política de admisión para login, registro y restauración.
  const establecerSesion = useCallback(async (nuevoToken: string, nuevaSesion: UsuarioSession) => {
    const decoded = authService.decodificarToken(nuevoToken);
    const rol = decoded?.idRol;
    const rolCoincide = rol === nuevaSesion?.idRol;

    if (!rolCoincide || (rol !== 1 && rol !== 2)) {
      const message = rolCoincide && (rol === 3 || rol === 4)
        ? 'Accede desde el panel web.'
        : 'Perfil no admitido.';
      // Bloquear el acceso local incluso si el almacenamiento no permite borrar.
      setSession(null);
      setToken(null);
      setDecodedToken(null);
      setRoleWarning(message);
      setCurrentScreen('auth');
      setIsLoading(false);
      try {
        await authService.logout();
      } catch {
        setRoleWarning(`${message} No se pudo eliminar la sesión guardada. Intenta de nuevo.`);
      }
      return;
    }

    setRoleWarning(null);
    setToken(nuevoToken);
    setSession(nuevaSesion);
    setDecodedToken(decoded);
    setCurrentScreen(rol === 1 ? 'crearReporte' : 'bandejaOrdenes');
    setIsLoading(false);
  }, [authService]);

  const cerrarSesion = async () => {
    setIsLoading(true);
    await authService.logout();
    setSession(null);
    setToken(null);
    setDecodedToken(null);
    setCurrentScreen('auth');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        token,
        decodedToken,
        isLoading,
        currentScreen,
        authService,
        catalogoService,
        storageService,
        setCurrentScreen,
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
