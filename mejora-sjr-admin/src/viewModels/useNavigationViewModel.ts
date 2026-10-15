/**
 * useNavigationViewModel.ts
 * ViewModel para la gestión del estado de navegación del panel administrativo.
 * 
 * Principios arquitectónicos aplicados:
 * - SRP (Single Responsibility Principle): Maneja exclusivamente el estado y las reglas de presentación de la navegación.
 *   No contiene elementos de renderizado JSX ni estilos.
 * - OCP (Open/Closed Principle): La lista de rutas es extensible sin alterar los métodos de control del sidebar o detección de ruta.
 * - Contrato Formal: Satisface la interfaz INavigationViewModel definida en la capa de modelos.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { INavigationViewModel, NavigationItem } from '../models/navigation.types';

const DEFAULT_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'nav-dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    iconName: 'layout-dashboard',
    requiredRoles: ['Admin', 'Superadmin', 'Trabajador']
  },
  {
    id: 'nav-incidencias',
    label: 'Incidencias',
    path: '/incidencias',
    iconName: 'alert-circle',
    requiredRoles: ['Admin', 'Superadmin', 'Trabajador']
  },
  {
    id: 'nav-catalogos',
    label: 'Catálogos',
    path: '/catalogos',
    iconName: 'database',
    requiredRoles: ['Admin', 'Superadmin']
  },
  {
    id: 'nav-usuarios',
    label: 'Usuarios',
    path: '/usuarios',
    iconName: 'users',
    requiredRoles: ['Superadmin']
  }
];

export function useNavigationViewModel(
  initialItems: NavigationItem[] = DEFAULT_NAVIGATION_ITEMS
): INavigationViewModel {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const pathname = usePathname() || '';

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const isActiveRoute = useCallback(
    (targetPath: string): boolean => {
      if (targetPath === '/dashboard') {
        return pathname === '/dashboard';
      }
      return pathname.startsWith(targetPath);
    },
    [pathname]
  );

  const navigationItems = useMemo(() => initialItems, [initialItems]);

  return {
    isSidebarOpen,
    currentPath: pathname,
    navigationItems,
    toggleSidebar,
    closeSidebar,
    isActiveRoute
  };
}
