/**
 * IntercepcionErrorView.tsx
 * Vista Corporativa Institucional para Pantallas de Intercepción 401 / 403 / 404 (US-015).
 *
 * Requerimiento US-015:
 * "Diseñar páginas profesionales de error (Unauthorized, Forbidden, Not Found).
 * Si el Route Guard expulsa a un usuario, debe caer en una pantalla con el diseño
 * corporativo (#0A3D62) indicando que no tiene privilegios, en lugar de un error de sistema."
 */

'use client';

import React, { Suspense } from 'react';
import {
  Building2,
  Compass,
  KeyRound,
  LayoutDashboard,
  LogIn,
  RefreshCw,
  ShieldAlert,
  UserX,
} from 'lucide-react';
import { CodigoIntercepcionHttp } from '../../models/intercepcion.types';
import { useIntercepcionViewModel } from '../../viewModels/useIntercepcionViewModel';

interface IntercepcionErrorViewProps {
  codigo: CodigoIntercepcionHttp;
  modo?: 'pantalla-completa' | 'embebido';
}

function obtenerIconoPrincipal(codigo: CodigoIntercepcionHttp) {
  if (codigo === 401) return KeyRound;
  if (codigo === 403) return ShieldAlert;
  return Compass;
}

const IntercepcionContenido: React.FC<IntercepcionErrorViewProps> = ({
  codigo,
  modo = 'pantalla-completa',
}) => {
  const {
    descriptor,
    tieneSesionAdminValida,
    irADashboard,
    irALogin,
    cambiarDeCuenta,
  } = useIntercepcionViewModel(codigo);

  const IconoEstado = obtenerIconoPrincipal(codigo);

  const tarjetaCentral = (
    <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
      {/* Cabecera Corporativa #0A3D62 */}
      <div className="bg-gradient-to-br from-[#0A3D62] via-[#0A3D62] to-[#072740] text-white px-8 py-8 md:px-10 md:py-10 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/15">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-wide text-white block">
                MEJORA SJR
              </span>
              <span className="text-[11px] uppercase tracking-widest text-sky-200 font-semibold block">
                Gobierno Municipal • San Juan del Río
              </span>
            </div>
          </div>

          <span className="inline-flex items-center self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-white/15 text-white border border-white/25">
            {descriptor.etiquetaHttp}
          </span>
        </div>

        <div className="relative z-10 pt-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-white text-[#0A3D62] flex items-center justify-center shrink-0 shadow-lg">
            <IconoEstado className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 block">
              {descriptor.insigniaSeguridad}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-snug">
              {descriptor.titulo}
            </h1>
          </div>
        </div>
      </div>

      {/* Cuerpo Informativo Institucional */}
      <div className="p-8 md:p-10 space-y-6">
        <p className="text-sm md:text-base font-medium text-slate-800 leading-relaxed">
          {descriptor.mensajePrincipal}
        </p>

        <div className="p-4 md:p-5 rounded-2xl bg-[#0A3D62]/5 border border-[#0A3D62]/15 space-y-3">
          <p className="text-xs md:text-sm text-slate-700 leading-relaxed">
            {descriptor.detalleInstitucional}
          </p>

          {(descriptor.rutaSolicitada || descriptor.rolDetectadoTexto) && (
            <div className="pt-2 border-t border-[#0A3D62]/10 flex flex-wrap items-center gap-2 text-xs">
              {descriptor.rutaSolicitada && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono">
                  Ruta: <strong>{descriptor.rutaSolicitada}</strong>
                </span>
              )}
              {descriptor.rolDetectadoTexto && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                  <UserX className="h-3.5 w-3.5 text-[#0A3D62]" />
                  <span>
                    Perfil detectado: <strong>{descriptor.rolDetectadoTexto}</strong>
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botones de Acción Corporativos */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {tieneSesionAdminValida ? (
            <>
              <button
                type="button"
                onClick={irADashboard}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-[#0A3D62] hover:bg-[#072740] text-white text-sm font-semibold transition-colors shadow-md shadow-[#0A3D62]/20"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Volver al Dashboard Ejecutivo</span>
              </button>

              <button
                type="button"
                onClick={cambiarDeCuenta}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Cambiar de Cuenta</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={irALogin}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-[#0A3D62] hover:bg-[#072740] text-white text-sm font-semibold transition-colors shadow-md shadow-[#0A3D62]/20"
            >
              <LogIn className="h-4 w-4" />
              <span>Iniciar Sesión Institucional</span>
            </button>
          )}
        </div>

        {/* Pie Institucional */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>H. Ayuntamiento de San Juan del Río • Seguridad Digital</span>
          <span className="font-semibold text-[#0A3D62]">Código HTTP {descriptor.codigo}</span>
        </div>
      </div>
    </div>
  );

  if (modo === 'embebido') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
        {tarjetaCentral}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 md:p-8 relative overflow-hidden">
      {/* Franja superior institucional #0A3D62 */}
      <div className="fixed top-0 inset-x-0 h-2 bg-[#0A3D62] z-20" />
      {tarjetaCentral}
    </div>
  );
};

export const IntercepcionErrorView: React.FC<IntercepcionErrorViewProps> = (props) => {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="h-10 w-10 border-4 border-[#0A3D62] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <IntercepcionContenido {...props} />
    </Suspense>
  );
};

