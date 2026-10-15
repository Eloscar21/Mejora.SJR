/**
 * Sidebar.tsx
 * Componente de presentación (Dumb Component) para la barra lateral de navegación.
 * 
 * Principios arquitectónicos aplicados:
 * - SRP (Single Responsibility Principle): Su única responsabilidad es renderizar la lista de navegación
 *   y notificar eventos mediante callbacks. No gestiona estado propio ni llama a servicios.
 * - Desacoplamiento de Vista: Recibe los datos y funciones desde el exterior (Props).
 * - Mapeo Seguro de Iconos: Traduce el identificador agnóstico (iconName: string) al renderizado visual correspondiente.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { NavigationItem } from '../../models/navigation.types';
import { 
  LayoutDashboard, 
  AlertCircle, 
  Database, 
  Users, 
  X,
  LucideIcon 
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  items: NavigationItem[];
  isActiveRoute: (path: string) => boolean;
  onClose: () => void;
}

// Diccionario de Iconos: La vista decide cómo pintar cada token de texto del modelo
const ICON_MAP: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  'alert-circle': AlertCircle,
  'database': Database,
  'users': Users
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  items,
  isActiveRoute,
  onClose
}) => {
  return (
    <>
      {/* Backdrop para dispositivos móviles */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Contenedor del Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-slate-900 text-white w-64 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabecera del Sidebar */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
              SJR
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-wide text-white">Mejora SJR</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Panel Admin</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Cerrar barra lateral"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {items.map(item => {
            const active = isActiveRoute(item.path);
            const IconComponent = ICON_MAP[item.iconName] || LayoutDashboard;

            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => {
                  // Cierra el sidebar en pantallas móviles al seleccionar una ruta
                  if (window.innerWidth < 1024) {
                    onClose();
                  }
                }}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <IconComponent className={`h-5 w-5 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pie del Sidebar */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <p className="truncate">Municipio de San Juan del Río</p>
          <p className="text-[10px] text-slate-500">v1.0.0 — Sprint 1</p>
        </div>
      </aside>
    </>
  );
};
