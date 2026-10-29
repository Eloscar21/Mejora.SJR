/**
 * Sidebar.tsx
 * Barra lateral fija en azul marino institucional para el Panel de Administración Mejora SJR.
 * 
 * Requerimiento US-006:
 * - "Sidebar fijo azul marino."
 * - Navegación visual y control de cierre de sesión.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  LayoutDashboard, 
  AlertCircle, 
  Database, 
  Settings, 
  LogOut, 
  ShieldCheck,
  UserCheck,
  Users
} from 'lucide-react';
import { AuthApiService } from '../../services/api/AuthApiService';

const authService = new AuthApiService();

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'Dashboard & JWT', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Personal Municipal', href: '/admin/personal', icon: Users, badge: 'US-009' },
    { label: 'Incidencias', href: '/dashboard/incidencias', icon: AlertCircle, badge: 'Próximamente' },
    { label: 'Catálogos', href: '/dashboard/catalogos', icon: Database, badge: 'US-002' },
    { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-[#0b132b] border-r border-slate-800 text-slate-300 flex flex-col z-30 shadow-xl">
      {/* 1. Header con Identidad Municipal */}
      <div className="h-16 px-6 flex items-center space-x-3 border-b border-slate-800/80 bg-[#070d1e]">
        <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white tracking-tight">Mejora SJR</span>
          <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
            San Juan del Río
          </span>
        </div>
      </div>

      {/* 2. Insignia de Seguridad RBAC */}
      <div className="mx-4 my-4 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs">
        <div className="flex items-center space-x-2 text-blue-300 font-semibold mb-1">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <span>Acceso Protegido</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Middleware activo: Exclusivo para Roles 3 y 4.
        </p>
      </div>

      {/* 3. Menú de Navegación */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          Módulos del Sistema
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 4. Footer con Cerrar Sesión */}
      <div className="p-4 border-t border-slate-800/80 bg-[#070d1e]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700/60 hover:border-red-800/60 transition-all text-xs font-medium"
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};
