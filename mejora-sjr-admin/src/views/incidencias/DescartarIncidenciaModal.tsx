'use client';

import React, { useId } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { Incidencia } from '../../models/incidencia.types';

interface DescartarIncidenciaModalProps {
  incidencia: Incidencia | null;
  motivo: string;
  errorMotivo: string | null;
  descartando: boolean;
  onCambiarMotivo: (valor: string) => void;
  onConfirmar: () => void;
  onCerrar: () => void;
}

const MOTIVOS_RAPIDOS = [
  'Reporte falso o sin evidencia real en sitio',
  'Ubicación inexistente dentro del municipio',
  'Reporte duplicado de un folio en atención',
  'Fotografía no corresponde a una incidencia municipal',
];

/**
 * DescartarIncidenciaModal
 * Modal institucional para descartar reportes ciudadanos falsos o improcedentes (US-026 / US-025).
 * Registra el motivo de auditoría y cambia la incidencia a Estado 5 (Rechazado).
 */
export const DescartarIncidenciaModal: React.FC<DescartarIncidenciaModalProps> = ({
  incidencia,
  motivo,
  errorMotivo,
  descartando,
  onCambiarMotivo,
  onConfirmar,
  onCerrar,
}) => {
  const textareaId = useId();

  if (!incidencia) return null;

  const folio = `#INC-${String(incidencia.idIncidencia).padStart(3, '0')}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-descartar-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Cabecera Corporativa #0A3D62 */}
        <div className="bg-[#0A3D62] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-red-200" />
            </div>
            <div>
              <h2 id="modal-descartar-titulo" className="text-base font-bold tracking-tight">
                Descartar Reporte Falso ({folio})
              </h2>
              <p className="text-xs text-blue-100">
                Auditoría Municipal • {incidencia.departamentoNombre} ({incidencia.categoriaNombre})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={descartando}
            aria-label="Cerrar modal de descarte"
            className="text-blue-100 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Baja administrativa por reporte improcedente o falso</p>
              <p className="text-amber-800 mt-0.5">
                El registro se marcará con estado <strong>Rechazado (5)</strong> conservando su historial para auditoría.
              </p>
            </div>
          </div>

          {/* Resumen de la incidencia */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-700">{folio}</span>
              <span>{incidencia.ciudadanoNombre || 'Ciudadano SJR'}</span>
            </div>
            <p className="text-slate-700 line-clamp-2">{incidencia.descripcion}</p>
          </div>

          {/* Motivos rápidos */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Motivos frecuentes de descarte
            </span>
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS_RAPIDOS.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="button"
                  onClick={() => onCambiarMotivo(sugerencia)}
                  disabled={descartando}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de motivo obligatorio */}
          <div className="space-y-1.5">
            <label
              htmlFor={textareaId}
              className="block text-xs font-semibold text-slate-700"
            >
              Motivo de descarte / justificación de auditoría <span className="text-red-600">*</span>
            </label>
            <textarea
              id={textareaId}
              rows={3}
              value={motivo}
              onChange={(e) => onCambiarMotivo(e.target.value)}
              disabled={descartando}
              placeholder="Describe por qué se descarta el reporte (mínimo 5 caracteres)..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
            {errorMotivo && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {errorMotivo}
              </p>
            )}
          </div>
        </div>

        {/* Footer de Acciones */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCerrar}
            disabled={descartando}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={descartando}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {descartando ? 'Descartando...' : 'Confirmar Descarte Falso'}
          </button>
        </div>
      </div>
    </div>
  );
};

