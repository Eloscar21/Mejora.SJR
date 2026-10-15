/**
 * navigation.types.ts
 * Contratos y estructuras de datos para el módulo de navegación del Panel Administrativo.
 * 
 * Principios arquitectónicos aplicados:
 * - ISP (Interface Segregation Principle): Interfaces atómicas y específicas para el estado y los elementos de navegación.
 * - SRP (Single Responsibility Principle): Define estrictamente las entidades de datos y contratos; no incluye lógica ni renderizado.
 * - Desacoplamiento de UI: Los iconos se identifican por identificadores agnósticos (strings/tokens), no por componentes JSX.
 */

export type RoleName = 'Ciudadano' | 'Trabajador' | 'Admin' | 'Superadmin';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  iconName: string;
  requiredRoles?: RoleName[];
  badgeCount?: number;
}

export interface INavigationViewModel {
  isSidebarOpen: boolean;
  currentPath: string;
  navigationItems: NavigationItem[];
  toggleSidebar: () => void;
  closeSidebar: () => void;
  isActiveRoute: (path: string) => boolean;
}
