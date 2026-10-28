'use client';

import { useState } from 'react';
import { AuthApiService } from '../services/api/AuthApiService';
import { usePersonalPruebasViewModel } from '../viewModels/usePersonalPruebasViewModel';
import { PersonalPruebasView } from '../views/personal/PersonalPruebasView';
import { crearPersonalApiServices } from './crearPersonalApiServices';
import { PersonalFormularios } from './PersonalFormularios';

/** Composición estable de la pantalla de desarrollo, con servicios API explícitos. */
export function PersonalPruebas() {
  const [dependencias] = useState(() => {
    const sesion = new AuthApiService();
    return { sesion, servicios: crearPersonalApiServices(sesion) };
  });
  const vm = usePersonalPruebasViewModel(dependencias.sesion, dependencias.servicios.consulta);

  return (
    <PersonalPruebasView viewModel={vm}>
      <PersonalFormularios
        accion={vm.accion}
        idRolActor={vm.idRolActor}
        servicios={dependencias.servicios}
        onCerrar={vm.cerrarFormulario}
        onCambio={vm.procesarCambioConfirmado}
      />
    </PersonalPruebasView>
  );
}
