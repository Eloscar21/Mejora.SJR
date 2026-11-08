/**
 * app/error.tsx
 * Error Boundary institucional con diseño corporativo (#0A3D62) para evitar pantallas crudas de sistema (US-015).
 */

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Building2, LayoutDashboard, RotateCcw } from 'lucide-react';

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Mejora SJR Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 md:p-8 relative">
      <div className="fixed top-0 inset-x-0 h-2 bg-[#0A3D62] z-20" />

      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#0A3D62] to-[#072740] text-white px-8 py-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-extrabold block">MEJORA SJR</span>
                <span className="text-[11px] uppercase tracking-widest text-sky-200 font-semibold block">
                  San Juan del Río
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 border border-white/25">
              Aviso Operativo
            </span>
          </div>

          <div className="pt-2 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white text-[#0A3D62] flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold">
                Incidencia temporal en la vista
              </h1>
              <p className="text-xs text-sky-100 mt-0.5">
                El sistema protegió tu sesión ante un inconveniente inesperado.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <p className="text-sm text-slate-700 leading-relaxed">
            No fue posible completar la carga de este componente en este instante. Puedes reintentar
            la operación o volver de forma segura al panel principal.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#0A3D62] hover:bg-[#072740] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reintentar</span>
            </button>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Ir al Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

