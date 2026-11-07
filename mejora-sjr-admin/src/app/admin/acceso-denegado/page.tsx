/**
 * app/admin/acceso-denegado/page.tsx
 * Página de Acceso Denegado Institucional (US-013).
 * 
 * Requerimiento:
 * "Si un Rol 3 (Admin) intenta acceder a /admin/personal (ruta exclusiva de Superadmin 4),
 * debe ser redirigido a una página de acceso denegado."
 */

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock } from 'lucide-react';

export default function AccesoDenegadoPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-xl p-8 md:p-10 text-center space-y-6">
        {/* Icono de Seguridad Institucional */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>

        {/* Título y Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
            <Lock className="w-3.5 h-3.5" />
            Control de Acceso RBAC • US-013
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Acceso Denegado
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
            La ruta solicitada (<code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono font-semibold">/admin/personal</code>) está restringida exclusivamente a usuarios con rol de <strong>Superadministrador (IdRol: 4)</strong>.
          </p>
        </div>

        {/* Alerta explicativa */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs md:text-sm text-left flex items-start space-x-3">
          <div className="font-semibold shrink-0">Aviso:</div>
          <div className="text-amber-800 leading-relaxed">
            Tu perfil de <strong>Administrador de Departamento (IdRol: 3)</strong> cuenta con facultades acotadas a tu dependencia municipal asignada. No posees autorización para la gestión global del personal de San Juan del Río.
          </div>
        </div>

        {/* Botones de Navegación Segura */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#0b132b] text-white text-sm font-semibold hover:bg-slate-800 transition-colors shadow-md shadow-slate-900/10"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Volver al Dashboard</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cambiar de Cuenta</span>
          </Link>
        </div>

        {/* Pie de página institucional */}
        <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
          Gobierno Municipal de San Juan del Río • Seguridad y Auditoría Digital
        </div>
      </div>
    </div>
  );
}
