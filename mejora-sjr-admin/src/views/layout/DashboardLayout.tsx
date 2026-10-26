/**
 * DashboardLayout.tsx
 * Estructura del panel administrativo con Sidebar fijo y Navbar superior.
 */

'use client';

import React from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Navbar } from '../../components/layout/Navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Sidebar Fijo */}
      <Sidebar />

      {/* 2. Área de Contenido Principal */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 pt-16 p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
