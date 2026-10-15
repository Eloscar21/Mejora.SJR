/**
 * CatalogoSelect.tsx
 * Componente genérico y reutilizable de selección (Dumb Component).
 * 
 * Principios arquitectónicos aplicados:
 * - SRP (Single Responsibility Principle): Renderiza un control select estilizado,
 *   estados de carga y notifica cambios por onChange.
 * - Reutilización: Acepta cualquier lista de opciones genéricas { value, label }.
 */

'use client';

import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

export interface SelectOption {
  value: number | string;
  label: string;
}

interface CatalogoSelectProps {
  id: string;
  label?: string;
  options: SelectOption[];
  selectedValue: number | string | null;
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

export const CatalogoSelect: React.FC<CatalogoSelectProps> = ({
  id,
  label,
  options,
  selectedValue,
  placeholder = 'Seleccione una opción...',
  isLoading = false,
  disabled = false,
  onChange
}) => {
  return (
    <div className="flex flex-col space-y-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={selectedValue !== null ? String(selectedValue) : ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled || isLoading}
          className={`w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-xs sm:text-sm text-slate-800 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
        >
          <option value="">{placeholder}</option>
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  );
};
