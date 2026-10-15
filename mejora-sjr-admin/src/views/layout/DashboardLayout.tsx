/**
 * DashboardLayout.tsx
 * Vista ensambladora de la estructura general del Panel de Administración.
 * 
 * Principios arquitectónicos aplicados:
 * - MVVM (Model-View-ViewModel): Consume 'useNavigationViewModel' como única fuente de verdad
 *   y pasa el estado hacia abajo a los componentes de presentación (Sidebar y Navbar).
 * - SRP (Single Responsibility Principle): Su responsabilidad es orquestar la disposición espacial
 *   del layout y conectar la vista con el ViewModel correspondiente.
 */

'use client';

import React from 'react';
import { useNavigationViewModel } from '../../viewModels/useNavigationViewModel';
import { Sidebar } from '../../components/layout/Sidebar';
import { Navbar } from '../../components/layout/Navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerActionsSlot?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  headerTitle,
  headerActionsSlot
}) => {
  const {
    isSidebarOpen,
    navigationItems,
    toggleSidebar,
    closeSidebar,
    isActiveRoute
  } = useNavigationViewModel();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* 1. Componente Tonto: Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        items={navigationItems}
        isActiveRoute={isActiveRoute}
        onClose={closeSidebar}
      />

      {/* 2. Área Principal de Trabajo */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Componente Tonto: Navbar */}
        <Navbar
          onToggleSidebar={toggleSidebar}
          headerTitle={headerTitle}
          headerActionsSlot={headerActionsSlot}
        />

        {/* 3. Contenedor de Vistas Hijas (Inyección dinámica) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
