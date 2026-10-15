/**
 * useCatalogoViewModel.ts
 * ViewModel para la gestión de catálogos y selectores dependientes en el Panel de Administración.
 * 
 * Principios arquitectónicos aplicados:
 * - MVVM (Model-View-ViewModel): Gestiona el estado reactivo, la carga y la lógica de filtrado de catálogos.
 * - DIP (Dependency Inversion Principle): Recibe una instancia de ICatalogoService inyectada.
 *   Por defecto utiliza MockCatalogoService para desarrollo autónomo.
 * - SRP (Single Responsibility Principle): No se mezcla con navegación ni con renderizado HTML.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ICatalogoService } from '../services/contracts/ICatalogoService';
import { MockCatalogoService } from '../services/mocks/MockCatalogoService';
import { Departamento, Categoria, Estado, Rol } from '../models/catalogo.types';

// Instancia singleton por defecto para desarrollo con Mocks
const defaultService: ICatalogoService = new MockCatalogoService();

export interface ICatalogoViewModel {
  departamentos: Departamento[];
  categorias: Categoria[];
  estados: Estado[];
  roles: Rol[];
  filteredCategorias: Categoria[];
  selectedDepartamentoId: number | null;
  isLoading: boolean;
  error: string | null;
  seleccionarDepartamento: (id: number | null) => void;
  recargarCatalogos: () => Promise<void>;
}

export function useCatalogoViewModel(
  service: ICatalogoService = defaultService
): ICatalogoViewModel {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [selectedDepartamentoId, setSelectedDepartamentoId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cargarCatalogos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [deptosData, catsData, estadosData, rolesData] = await Promise.all([
        service.obtenerDepartamentos(),
        service.obtenerCategorias(),
        service.obtenerEstados(),
        service.obtenerRoles()
      ]);

      setDepartamentos(deptosData);
      setCategorias(catsData);
      setEstados(estadosData);
      setRoles(rolesData);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al cargar los catálogos';
      setError(mensaje);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  // Selección de departamento para filtrado reactivo de categorías
  const seleccionarDepartamento = useCallback((id: number | null) => {
    setSelectedDepartamentoId(id);
  }, []);

  // Categorías filtradas en cascada según el departamento activo
  const filteredCategorias = useMemo(() => {
    if (selectedDepartamentoId === null) {
      return categorias;
    }
    return categorias.filter(cat => cat.idDepartamento === selectedDepartamentoId);
  }, [categorias, selectedDepartamentoId]);

  return {
    departamentos,
    categorias,
    estados,
    roles,
    filteredCategorias,
    selectedDepartamentoId,
    isLoading,
    error,
    seleccionarDepartamento,
    recargarCatalogos: cargarCatalogos
  };
}
