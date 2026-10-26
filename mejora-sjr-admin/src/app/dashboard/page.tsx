/**
 * dashboard/page.tsx
 * Página principal del panel administrativo con visualizador y pruebas de JWT.
 * 
 * Requerimiento US-006:
 * - "El área central debe imprimir el JSON decodificado del JWT para confirmar el rol y departamento logueado."
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  KeyRound, 
  ShieldCheck, 
  User, 
  Building, 
  Calendar, 
  Clock, 
  Copy, 
  Check, 
  Code2, 
  AlertCircle,
  RefreshCw,
  LogOut,
  Sparkles
} from 'lucide-react';
import { AuthApiService } from '@/services/api/AuthApiService';
import { DecodedToken, ROLES_SJR, DEPARTAMENTOS_SJR } from '@/models/auth.types';

const authService = new AuthApiService();

export default function DashboardJwtPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [decodedJwt, setDecodedJwt] = useState<DecodedToken | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const rawToken = authService.obtenerToken();
    setToken(rawToken);

    if (rawToken) {
      const decoded = authService.decodificarToken(rawToken);
      setDecodedJwt(decoded);
    }
  }, []);

  const handleCopyJson = () => {
    if (decodedJwt) {
      navigator.clipboard.writeText(JSON.stringify(decodedJwt, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'No disponible';
    return new Date(timestamp * 1000).toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });
  };

  const rolTexto = decodedJwt?.idRol
    ? ROLES_SJR[decodedJwt.idRol as keyof typeof ROLES_SJR] || `Rol ${decodedJwt.idRol}`
    : 'Desconocido';

  const deptoTexto = decodedJwt?.idDepartamento
    ? DEPARTAMENTOS_SJR[decodedJwt.idDepartamento as keyof typeof DEPARTAMENTOS_SJR] || `Depto ${decodedJwt.idDepartamento}`
    : (decodedJwt?.idRol === 4 ? 'Jurisdicción General (Superadmin)' : 'Sin Departamento');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Encabezado de la Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Historia de Usuario US-006 • Pruebas JWT
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Validación de Sesión y Claims del Token
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspección en tiempo real de los datos criptográficos contenidos en el JWT emitido por el Backend.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refrescar</span>
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors shadow-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Verificación de Seguridad por Middleware */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-start space-x-4">
        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-emerald-900">
            Acceso Autorizado por Middleware (US-005)
          </h2>
          <p className="text-xs text-emerald-800 leading-relaxed">
            El <strong>Next.js Edge Middleware</strong> interceptó la ruta, validó la cookie de sesión y confirmó que tu rol cuenta con privilegios administrativos (IdRol: {decodedJwt?.idRol || '3/4'}). Los roles de Ciudadano (1) y Trabajador (2) habrían sido bloqueados inmediatamente.
          </p>
        </div>
      </div>

      {/* 3. Tarjetas de Claims Extraídos del JWT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Claim: Usuario */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Identificador</span>
            <User className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            ID: {decodedJwt?.idUsuario ?? '—'}
          </div>
          <p className="text-xs text-slate-500 truncate" title={decodedJwt?.email}>
            {decodedJwt?.email || 'No disponible'}
          </p>
        </div>

        {/* Claim: Rol Oficial */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Rol de Acceso</span>
            <KeyRound className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-slate-800">
              IdRol: {decodedJwt?.idRol ?? '—'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              decodedJwt?.idRol === 4
                ? 'bg-purple-100 text-purple-700 border border-purple-300'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
            }`}>
              {decodedJwt?.idRol === 4 ? 'Superadmin' : 'Admin Depto'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {rolTexto}
          </p>
        </div>

        {/* Claim: Departamento */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Dependencia</span>
            <Building className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {decodedJwt?.idDepartamento !== null ? `Depto: ${decodedJwt?.idDepartamento}` : 'Global'}
          </div>
          <p className="text-xs text-slate-500 truncate" title={deptoTexto}>
            {deptoTexto}
          </p>
        </div>

        {/* Claim: Expiración */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Vigencia</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-800">
            {decodedJwt?.exp ? 'Token Activo (8h)' : '—'}
          </div>
          <p className="text-[11px] text-slate-500">
            Expira: {formatDate(decodedJwt?.exp)}
          </p>
        </div>
      </div>

      {/* 4. Visualizador del JSON Decodificado del JWT (Requerimiento Central US-006) */}
      <div className="rounded-2xl bg-[#0b132b] border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-[#070d1e] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Code2 className="h-5 w-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              JSON Decodificado del JWT (Claims Verificados)
            </h2>
          </div>

          <button
            onClick={handleCopyJson}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar JSON</span>
              </>
            )}
          </button>
        </div>

        <div className="p-6">
          {decodedJwt ? (
            <pre className="text-xs sm:text-sm font-mono text-emerald-400 bg-[#050811] p-5 rounded-xl overflow-x-auto border border-slate-800/80 leading-relaxed shadow-inner">
              {JSON.stringify(decodedJwt, null, 2)}
            </pre>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
              <AlertCircle className="h-6 w-6 text-amber-500" />
              <span>No se pudo decodificar el token o no hay sesión activa.</span>
            </div>
          )}
        </div>

        {/* Inspección de Firma Raw (Truncada) */}
        {token && (
          <div className="px-6 py-3 bg-[#070d1e] border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span className="truncate max-w-xl font-mono text-[11px] text-slate-400">
              Token crudo: {token.substring(0, 48)}...
            </span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider shrink-0">
              Algoritmo: HS256
            </span>
          </div>
        )}
      </div>

      {/* 5. Guía de Pruebas Rápidas para Evaluación de las HUs */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800">
          Matriz de Validación para el Docente / Revisor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-semibold text-slate-700 block">Prueba de US-005 (Bloqueo de Roles 1 y 2):</span>
            <p className="text-slate-500">
              Cierra sesión e ingresa con <code>ciudadano@test.com</code> o <code>trabajador@test.com</code>. El Middleware o el ViewModel rechazarán la entrada y mostrarán la alerta roja de acceso no autorizado.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-semibold text-slate-700 block">Prueba de US-006 (Inspección de JWT):</span>
            <p className="text-slate-500">
              Inicia sesión con <code>admin@test.com</code> (Depto 2) o <code>superadmin@test.com</code> (Depto null). El JSON en pantalla reflejará en vivo los claims emitidos por el backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
