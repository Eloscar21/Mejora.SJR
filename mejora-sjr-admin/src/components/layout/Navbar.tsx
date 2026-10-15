/**
 * Navbar.tsx
 * Componente de presentación (Dumb Component) para la barra superior de navegación.
 * 
 * Principios arquitectónicos aplicados:
 * - SRP (Single Responsibility Principle): Renderiza controles de cabecera y notifica eventos de toggle.
 * - OCP (Open/Closed Principle): Incluye 'headerActionsSlot' para permitir que el equipo inyecte
 *   selectores de catálogos o filtros globales en el futuro sin modificar la estructura del Navbar.
 */

'use client';

import React from 'react';
import { Menu, Bell, User } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  headerTitle?: string;
  userName?: string;
  userRole?: string;
  headerActionsSlot?: React.ReactNode; // Slot para extensión futura de catálogos (OCP)
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  headerTitle = 'Panel de Administración',
  userName = 'Administrador Municipal',
  userRole = 'Admin General',
  headerActionsSlot
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Botón Hamburguesa y Título de la Sección */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
          aria-label="Alternar menú lateral"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
          {headerTitle}
        </h1>
      </div>

      {/* Acciones del Navbar (Slots para Catálogos / Filtros + Perfil) */}
      <div className="flex items-center space-x-4">
        {/* Slot extensible: Aquí vivirá el selector de departamentos o catálogos en el futuro */}
        {headerActionsSlot && (
          <div className="hidden md:flex items-center space-x-2">
            {headerActionsSlot}
          </div>
        )}

        {/* Notificaciones */}
        <button
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* Separador */}
        <div className="h-6 w-px bg-slate-200" />

        {/* Perfil del Usuario Funcionario */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-700 leading-none">{userName}</span>
            <span className="text-[10px] text-slate-500 mt-0.5 leading-none">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
