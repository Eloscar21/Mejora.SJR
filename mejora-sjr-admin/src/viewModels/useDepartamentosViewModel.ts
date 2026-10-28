'use client';

import { useEffect, useRef, useState } from 'react';
import type { Departamento } from '../models/catalogo.types';
import type { IDepartamentoConsultaService } from '../services/contracts/IDepartamentoConsultaService';

/** Estado del selector compartido por creación y edición. */
export function useDepartamentosViewModel(catalogo: IDepartamentoConsultaService) {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [isLoadingDepartamentos, setIsLoadingDepartamentos] = useState(true);
  const [errorDepartamentos, setErrorDepartamentos] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const disponible = useRef(false);

  useEffect(() => {
    let vigente = true;
    disponible.current = false;
    setDepartamentos([]);
    setIsLoadingDepartamentos(true);
    setErrorDepartamentos(null);

    const cargar = async () => {
      try {
        const lista = await catalogo.obtenerDepartamentos();
        if (vigente) {
          disponible.current = lista.length > 0;
          setDepartamentos(lista);
          if (lista.length === 0) setErrorDepartamentos('No hay departamentos disponibles.');
        }
      } catch (error: unknown) {
        if (vigente) {
          setErrorDepartamentos(error instanceof Error ? error.message : 'No se pudieron cargar los departamentos.');
        }
      } finally {
        if (vigente) setIsLoadingDepartamentos(false);
      }
    };
    void cargar();

    return () => { vigente = false; };
  }, [catalogo, intento]);

  function reintentarDepartamentos() {
    disponible.current = false;
    setIsLoadingDepartamentos(true);
    setErrorDepartamentos(null);
    setIntento((actual) => actual + 1);
  }

  return {
    departamentos, isLoadingDepartamentos, errorDepartamentos,
    reintentarDepartamentos, estaDisponible: () => disponible.current,
  };
}
