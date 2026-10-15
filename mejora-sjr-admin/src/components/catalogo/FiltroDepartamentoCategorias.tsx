/**
 * FiltroDepartamentoCategorias.tsx
 * Componente que conecta useCatalogoViewModel con los selectores en cascada.
 * Puede montarse directamente en el 'headerActionsSlot' del Navbar o dentro de cualquier vista.
 * 
 * Principios arquitectónicos aplicados:
 * - MVVM: Consume el ViewModel de catálogos y alimenta a los componentes de presentación CatalogoSelect.
 * - Reactividad en Cascada: Al seleccionar un departamento (ej. JAPAM), el selector de categorías
 *   se actualiza de inmediato para mostrar solo las opciones asociadas (Fugas de agua, Alcantarillado).
 */

'use client';

import React from 'react';
import { useCatalogoViewModel } from '../../viewModels/useCatalogoViewModel';
import { CatalogoSelect } from './CatalogoSelect';

export const FiltroDepartamentoCategorias: React.FC = () => {
  const {
    departamentos,
    filteredCategorias,
    selectedDepartamentoId,
    isLoading,
    error,
    seleccionarDepartamento
  } = useCatalogoViewModel();

  if (error) {
    return (
      <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
        Error al cargar filtros
      </div>
    );
  }

  const opcionesDepartamentos = departamentos.map(d => ({
    value: d.idDepartamento,
    label: d.nombre
  }));

  const opcionesCategorias = filteredCategorias.map(c => ({
    value: c.idCategoria,
    label: c.nombre
  }));

  return (
    <div className="flex items-center space-x-2">
      {/* Selector de Departamento */}
      <CatalogoSelect
        id="filtro-depto"
        placeholder="Todos los Departamentos"
        options={opcionesDepartamentos}
        selectedValue={selectedDepartamentoId}
        isLoading={isLoading}
        onChange={val => {
          const id = val === '' ? null : Number(val);
          seleccionarDepartamento(id);
        }}
      />

      {/* Selector de Categorías (en cascada) */}
      <CatalogoSelect
        id="filtro-categoria"
        placeholder={
          selectedDepartamentoId
            ? 'Todas las categorías'
            : 'Seleccione depto primero...'
        }
        options={opcionesCategorias}
        selectedValue={null}
        disabled={isLoading || opcionesCategorias.length === 0}
        isLoading={isLoading}
        onChange={val => {
          console.log('Categoría seleccionada:', val);
        }}
      />
    </div>
  );
};
