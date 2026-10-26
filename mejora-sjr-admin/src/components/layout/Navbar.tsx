/**
 * Navbar.tsx
 * Barra superior institucional para el Panel de Administración Mejora SJR.
 * 
 * Muestra la información del funcionario autenticado (Nombre, Rol y Departamento).
 */

'use client';

import React, { useEffect, useState } from 'react';
import { User, Shield, Building, Bell } from 'lucide-react';
import { AuthApiService } from '../../services/api/AuthApiService';
import { UsuarioSession, ROLES_SJR, DEPARTAMENTOS_SJR } from '../../models/auth.types';

const authService = new AuthApiService();

export const Navbar: React.FC = () => {
  const [usuario, setUsuario] = useState<UsuarioSession | null>(null);

  useEffect(() => {
    // 1. Intentar leer desde localStorage
    const userSession = authService.obtenerUsuario();
    if (userSession) {
      setUsuario(userSession);
    } else {
      // 2. Intentar decodificar desde el token
      const decoded = authService.decodificarToken();
      if (decoded) {
        setUsuario({
          idUsuario: decoded.idUsuario,
          nombre: decoded.email.split('@')[0],
          email: decoded.email,
          idRol: decoded.idRol,
          idDepartamento: decoded.idDepartamento
        });
      }
    }
  }, []);

  const rolNombre = usuario?.idRol 
    ? (ROLES_SJR[usuario.idRol as keyof typeof ROLES_SJR] || `Rol ${usuario.idRol}`)
    : 'Cargando...';

  const deptoNombre = usuario?.idDepartamento
    ? (DEPARTAMENTOS_SJR[usuario.idDepartamento as keyof typeof DEPARTAMENTOS_SJR] || `Depto ${usuario.idDepartamento}`)
    : (usuario?.idRol === 4 ? 'Municipio General (Superadmin)' : 'Sin Departamento');

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-slate-200 z-20 px-8 flex items-center justify-between shadow-sm">
      {/* Título de Sección */}
      <div className="flex items-center space-x-3">
        <h2 className="text-base font-semibold text-slate-800">
          Panel de Control y Supervisión
        </h2>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
          San Juan del Río
        </span>
      </div>

      {/* Perfil del Funcionario */}
      <div className="flex items-center space-x-4">
        {/* Notificaciones */}
        <button
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* Datos del Funcionario */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs shadow-sm">
            {usuario?.nombre ? usuario.nombre.substring(0, 2).toUpperCase() : 'AD'}
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {usuario?.nombre || usuario?.email || 'Funcionario'}
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                usuario?.idRol === 4 
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {rolNombre}
              </span>
              <span className="text-[10px] text-slate-400">•</span>
              <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                {deptoNombre}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
