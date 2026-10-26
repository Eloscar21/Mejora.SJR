/**
 * AuthProvider.tsx
 * Contenedor de Inversión de Control (IoC) y Contexto de Autenticación para la aplicación móvil.
 * 
 * Principios aplicados:
 * - DIP (Dependency Inversion Principle): Inyecta abstracciones IAuthService, ICatalogoService, IStorageService.
 * - SRP: Mantiene el estado global de la sesión y coordina la navegación de nivel superior.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  establecerSesion: (token: string, session: UsuarioSession) => void;
  cerrarSesion: () => Promise<void>;
  navegarPorRol: (rol: number) => void;
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

  // Inicialización de servicios desacoplados
  const authService = useMemo<IAuthService>(() => {
    if (customAuthService) return customAuthService;
    return useMock ? new MockAuthService(customStorageService) : new AuthApiService();
  }, [customAuthService, customStorageService, useMock]);

  const catalogoService = useMemo<ICatalogoService>(() => {
    if (customCatalogoService) return customCatalogoService;
    return useMock ? new MockCatalogoService() : new CatalogoApiService();
  }, [customCatalogoService, useMock]);

  const storageService = useMemo<IStorageService>(() => {
    return customStorageService;
  }, [customStorageService]);

  // Navegación condicional por rol requerida en US-003:
  // - Rol 1 (Ciudadano) -> "Crear Reporte"
  // - Rol 2 (Trabajador) -> "Bandeja de Órdenes"
  const navegarPorRol = (rol: number) => {
    if (rol === 1) {
      setCurrentScreen('crearReporte');
    } else if (rol === 2) {
      setCurrentScreen('bandejaOrdenes');
    } else {
      // Perfiles 3 y 4: advertir o permitir inspección en modo auditor
      setCurrentScreen('crearReporte');
    }
  };

  const establecerSesion = (nuevoToken: string, nuevaSesion: UsuarioSession) => {
    setToken(nuevoToken);
    setSession(nuevaSesion);
    const decoded = authService.decodificarToken(nuevoToken);
    setDecodedToken(decoded);
    if (decoded?.idRol) {
      navegarPorRol(decoded.idRol);
    } else if (nuevaSesion?.idRol) {
      navegarPorRol(nuevaSesion.idRol);
    }
  };

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
        cerrarSesion,
        navegarPorRol,
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
