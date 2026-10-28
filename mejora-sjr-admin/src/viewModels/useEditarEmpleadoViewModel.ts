'use client';

import { useEffect, useRef, useState } from 'react';
import type { Empleado, RolEmpleado } from '../models/empleado.types';
import type { IDepartamentoConsultaService } from '../services/contracts/IDepartamentoConsultaService';
import type { IEmpleadoGestionService } from '../services/contracts/IEmpleadoGestionService';
import { useDepartamentosViewModel } from './useDepartamentosViewModel';

interface EditarEmpleadoForm {
  nombre: string;
  idRol: RolEmpleado | null;
  idDepartamento: number | null;
}

type FormErrors = Partial<Record<keyof EditarEmpleadoForm, string>>;

/** Una instancia por apertura y empleado: el contenedor debe usar key=idUsuario. */
export function useEditarEmpleadoViewModel(
  empleado: Empleado,
  gestion: Pick<IEmpleadoGestionService, 'actualizarEmpleado'>,
  catalogo: IDepartamentoConsultaService,
  onActualizado?: (empleado: Empleado) => void
) {
  // Copia inicial: cambios en la tabla no deben sobrescribir una edición en curso.
  const [empleadoInicial] = useState<Empleado>(() => ({ ...empleado }));
  const [form, setForm] = useState<EditarEmpleadoForm>(() => ({
    nombre: empleadoInicial.nombre,
    idRol: empleadoInicial.idRol,
    idDepartamento: empleadoInicial.idDepartamento,
  }));
  const catalogoVM = useDepartamentosViewModel(catalogo);
  const { departamentos, isLoadingDepartamentos, errorDepartamentos } = catalogoVM;
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empleadoActualizado, setEmpleadoActualizado] = useState<Empleado | null>(null);
  const envioEnCurso = useRef(false);
  const edicionTerminada = useRef(false);
  const edicionNotificada = useRef(false);
  const montado = useRef(false);
  const errorEmpleado = empleadoInicial.activo ? null : 'No se puede editar un empleado inactivo.';

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  useEffect(() => {
    if (empleadoActualizado && onActualizado && !edicionNotificada.current) {
      edicionNotificada.current = true;
      onActualizado(empleadoActualizado);
    }
  }, [empleadoActualizado, onActualizado]);

  function cambiarCampo<K extends keyof EditarEmpleadoForm>(campo: K, valor: EditarEmpleadoForm[K]) {
    if (envioEnCurso.current || edicionTerminada.current || errorEmpleado) return;
    setForm((actual) => ({ ...actual, [campo]: valor }));
    setErrors((actual) => ({ ...actual, [campo]: undefined }));
    setErrorEnvio(null);
  }

  function cambiarRol(valor: string) {
    cambiarCampo('idRol', valor === '2' ? 2 : valor === '3' ? 3 : null);
  }

  function cambiarDepartamento(valor: string) {
    const id = Number(valor);
    cambiarCampo('idDepartamento', Number.isSafeInteger(id) && id > 0 ? id : null);
  }

  function reintentarDepartamentos() {
    if (envioEnCurso.current || edicionTerminada.current) return;
    catalogoVM.reintentarDepartamentos();
  }

  const puedeEnviar = !errorEmpleado && !isLoadingDepartamentos && !errorDepartamentos &&
    departamentos.length > 0 && !isSubmitting && !empleadoActualizado;

  async function enviar(): Promise<Empleado | null> {
    if (envioEnCurso.current || edicionTerminada.current || !montado.current || errorEmpleado) return null;
    if (!puedeEnviar || !catalogoVM.estaDisponible()) {
      setErrorEnvio('Carga los departamentos antes de guardar los cambios.');
      return null;
    }

    const nuevosErrores: FormErrors = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio.';
    if (form.idRol !== 2 && form.idRol !== 3) nuevosErrores.idRol = 'Selecciona un rol permitido.';
    if (!departamentos.some((departamento) => departamento.idDepartamento === form.idDepartamento)) {
      nuevosErrores.idDepartamento = 'Selecciona un departamento disponible.';
    }
    setErrors(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return null;

    envioEnCurso.current = true;
    setIsSubmitting(true);
    setErrorEnvio(null);
    try {
      const actualizado = await gestion.actualizarEmpleado(empleadoInicial.idUsuario, {
        nombre: form.nombre.trim(),
        idRol: form.idRol as RolEmpleado,
        idDepartamento: form.idDepartamento as number,
      });
      if (!montado.current) return null;
      edicionTerminada.current = true;
      setEmpleadoActualizado(actualizado);
      return actualizado;
    } catch (error: unknown) {
      if (montado.current) {
        setErrorEnvio(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
      }
      return null;
    } finally {
      envioEnCurso.current = false;
      if (montado.current) setIsSubmitting(false);
    }
  }

  return {
    idUsuario: empleadoInicial.idUsuario, email: empleadoInicial.email,
    form, errors, departamentos, isLoadingDepartamentos, errorDepartamentos,
    isSubmitting, errorEnvio, errorEmpleado, empleadoActualizado, puedeEnviar,
    cambiarCampo, cambiarRol, cambiarDepartamento, reintentarDepartamentos, enviar,
  };
}
