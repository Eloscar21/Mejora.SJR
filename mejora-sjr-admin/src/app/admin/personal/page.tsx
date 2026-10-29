'use client';

import React, { useMemo } from 'react';
import { AuthApiService } from '@/services/api/AuthApiService';
import { crearPersonalApiServices } from '@/providers/crearPersonalApiServices';
import { usePersonalTableViewModel } from '@/viewModels/usePersonalTableViewModel';
import { PersonalDataGrid } from '@/views/personal/PersonalDataGrid';

/**
 * /admin/personal
 * Pantalla principal de Gestión de Personal Municipal (US-009).
 * 
 * Requerimiento US-009:
 * "Pantalla principal (/admin/personal) con una tabla de datos (DataGrid) que liste a los empleados,
 * incluyendo botones de acción (Lápiz para editar, Basurero para desactivar)."
 */
export default function AdminPersonalPage() {
  const authService = useMemo(() => new AuthApiService(), []);
  const servicios = useMemo(() => crearPersonalApiServices(authService), [authService]);
  const viewModel = usePersonalTableViewModel(authService, servicios.consulta);

  return <PersonalDataGrid viewModel={viewModel} servicios={servicios} />;
}
