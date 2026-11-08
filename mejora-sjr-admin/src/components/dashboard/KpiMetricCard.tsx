/**
 * KpiMetricCard.tsx
 * Tarjeta reutilizable de indicador ejecutivo (KPI) para el Panel de Control Municipal (US-014).
 *
 * Principios aplicados:
 * - SRP / Dumb Component: Recibe únicamente propiedades de presentación e interacción.
 * - Identidad Institucional: Integra el azul corporativo (#0A3D62) y semántica clara de gestión urbana.
 */

'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type KpiCardVariant = 'nuevos' | 'proceso' | 'resueltos' | 'consolidado';

interface KpiMetricCardProps {
  titulo: string;
  valor: number | string;
  descripcion: string;
  etiquetaEstado: string;
  icono: LucideIcon;
  variante: KpiCardVariant;
  activo?: boolean;
  onClick?: () => void;
}

const ESTILOS_VARIANTE: Record<
  KpiCardVariant,
  {
    barraSuperior: string;
    iconoContenedor: string;
    insignia: string;
    anilloActivo: string;
  }
> = {
  nuevos: {
    barraSuperior: 'bg-[#0A3D62]',
    iconoContenedor: 'bg-[#0A3D62]/10 text-[#0A3D62] border-[#0A3D62]/20',
    insignia: 'bg-sky-50 text-[#0A3D62] border-sky-200',
    anilloActivo: 'ring-2 ring-[#0A3D62] border-[#0A3D62]',
  },
  proceso: {
    barraSuperior: 'bg-amber-500',
    iconoContenedor: 'bg-amber-50 text-amber-700 border-amber-200',
    insignia: 'bg-amber-50 text-amber-800 border-amber-200',
    anilloActivo: 'ring-2 ring-amber-500 border-amber-500',
  },
  resueltos: {
    barraSuperior: 'bg-emerald-600',
    iconoContenedor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    insignia: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    anilloActivo: 'ring-2 ring-emerald-600 border-emerald-600',
  },
  consolidado: {
    barraSuperior: 'bg-slate-700',
    iconoContenedor: 'bg-slate-100 text-slate-700 border-slate-200',
    insignia: 'bg-slate-100 text-slate-700 border-slate-200',
    anilloActivo: 'ring-2 ring-slate-700 border-slate-700',
  },
};

export const KpiMetricCard: React.FC<KpiMetricCardProps> = ({
  titulo,
  valor,
  descripcion,
  etiquetaEstado,
  icono: Icono,
  variante,
  activo = false,
  onClick,
}) => {
  const estilos = ESTILOS_VARIANTE[variante];
  const esInteractivo = Boolean(onClick);

  const contenido = (
    <>
      <div className={`h-1.5 w-full ${estilos.barraSuperior}`} />
      <div className="p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {titulo}
            </span>
            <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              {valor}
            </div>
          </div>

          <div
            className={`h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm ${estilos.iconoContenedor}`}
          >
            <Icono className="h-6 w-6" />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 text-left leading-snug">{descripcion}</span>
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${estilos.insignia}`}
          >
            {etiquetaEstado}
          </span>
        </div>
      </div>
    </>
  );

  if (esInteractivo) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={activo}
        className={`w-full rounded-2xl bg-white border shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none ${
          activo ? estilos.anilloActivo : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {contenido}
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      {contenido}
    </div>
  );
};

