/**
 * LoginView.tsx
 * Vista Split Screen Institucional para autenticación del personal municipal.
 * 
 * Principios aplicados:
 * - MVVM (Dumb View / Componente de presentación): No contiene llamadas directas a APIs.
 * - Consume 'useLoginViewModel' para toda la reactividad y gestión de estados.
 * - Estética Institucional Premium con identidad de San Juan del Río (Azul marino y blanco).
 */

'use client';

import React, { useState } from 'react';
import { useLoginViewModel } from '../../viewModels/useLoginViewModel';
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    email,
    password,
    isLoading,
    errorMessage,
    infoMessage,
    handleEmailChange,
    handlePasswordChange,
    handleSubmit,
    setQuickCredentials
  } = useLoginViewModel();

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* ======================================================== */}
      {/* 1. LADO IZQUIERDO: HERO INSTITUCIONAL (SPLIT SCREEN)   */}
      {/* ======================================================== */}
      <div className="md:w-1/2 bg-gradient-to-br from-[#0b132b] via-[#0f172a] to-[#1e293b] text-white p-8 md:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Adorno visual abstracto de fondo */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Cabecera / Identidad Municipal */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">MEJORA SJR</span>
              <span className="text-xs uppercase tracking-widest text-blue-300 font-semibold block">
                San Juan del Río, Qro.
              </span>
            </div>
          </div>

          <div className="space-y-4 max-w-lg mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Gobierno Digital y Atención Ciudadana
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Panel Administrativo exclusivo para funcionarios públicos, supervisores de área y directores de dependencias municipales.
            </p>
          </div>
        </div>

        {/* Pilares Institucionales */}
        <div className="relative z-10 my-8 space-y-4">
          <div className="flex items-start space-x-3.5 bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-white">Control de Acceso por Roles (RBAC)</h2>
              <p className="text-xs text-slate-300">
                Acceso restringido a Administradores (IdRol: 3) y Superadmins (IdRol: 4).
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5 bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
            <FileText className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-white">Canalización a Dependencias</h2>
              <p className="text-xs text-slate-300">
                Seguimiento en tiempo real para JAPAM (Agua) y Servicios Públicos Municipales.
              </p>
            </div>
          </div>
        </div>

        {/* Pie institucional */}
        <div className="relative z-10 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span>H. Ayuntamiento de San Juan del Río 2024-2027</span>
          <span className="text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-md text-slate-300 border border-slate-700">
            Sprint 1 • US-005
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. LADO DERECHO: FORMULARIO DE ACCESO FUNCIONARIOS      */}
      {/* ======================================================== */}
      <div className="md:w-1/2 p-6 md:p-12 lg:p-16 flex flex-col justify-center items-center bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Encabezado del Formulario */}
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Acceso Institucional
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Iniciar Sesión
            </h2>
            <p className="text-sm text-slate-500">
              Ingresa tus credenciales oficiales para gestionar incidencias.
            </p>
          </div>

          {/* Banner de Error (con explicación si fue bloqueado por Middleware) */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-800 animate-fadeIn">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm leading-relaxed">
                <span className="font-semibold block mb-0.5">Atención</span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Banner Informativo */}
          {infoMessage && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start space-x-3 text-blue-800">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm leading-relaxed">
                {infoMessage}
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Correo */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-slate-700">
                Correo Electrónico Institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="ejemplo@test.com"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => handlePasswordChange(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Botón Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Validando con servidor...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          {/* ======================================================== */}
          {/* BANEL DE PRUEBAS RÁPIDAS (Para evaluar el Middleware)   */}
          {/* ======================================================== */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                Cuentas Semilla para Pruebas (US-005)
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 mb-3">
              Haz clic en cualquier cuenta para probar las reglas de bloqueo del Middleware:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Rol 1: Bloqueado */}
              <button
                type="button"
                onClick={() => setQuickCredentials('ciudadano@test.com')}
                className="text-left p-2.5 rounded-lg border border-red-200 bg-red-50/60 hover:bg-red-50 transition-colors text-xs"
              >
                <div className="flex items-center space-x-1.5 text-red-700 font-medium">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Ciudadano (Rol 1)</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">ciudadano@test.com</div>
                <div className="text-[10px] text-red-600 font-semibold mt-0.5">Bloqueado en Web</div>
              </button>

              {/* Rol 2: Bloqueado */}
              <button
                type="button"
                onClick={() => setQuickCredentials('trabajador@test.com')}
                className="text-left p-2.5 rounded-lg border border-red-200 bg-red-50/60 hover:bg-red-50 transition-colors text-xs"
              >
                <div className="flex items-center space-x-1.5 text-red-700 font-medium">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>Trabajador (Rol 2)</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">trabajador@test.com</div>
                <div className="text-[10px] text-red-600 font-semibold mt-0.5">Bloqueado en Web</div>
              </button>

              {/* Rol 3: Permitido */}
              <button
                type="button"
                onClick={() => setQuickCredentials('admin@test.com')}
                className="text-left p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 transition-colors text-xs"
              >
                <div className="flex items-center space-x-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Admin Depto (Rol 3)</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">admin@test.com</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Acceso Permitido</div>
              </button>

              {/* Rol 4: Permitido */}
              <button
                type="button"
                onClick={() => setQuickCredentials('superadmin@test.com')}
                className="text-left p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 transition-colors text-xs"
              >
                <div className="flex items-center space-x-1.5 text-emerald-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Superadmin (Rol 4)</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">superadmin@test.com</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Acceso Permitido</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
