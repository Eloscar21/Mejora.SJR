'use client';

import { useEffect, useRef, useState } from 'react';
import type { Empleado, RolEmpleado } from '../models/empleado.types';
import type { IDepartamentoConsultaService } from '../services/contracts/IDepartamentoConsultaService';
import type { IEmpleadoGestionService } from '../services/contracts/IEmpleadoGestionService';
import { useDepartamentosViewModel } from './useDepartamentosViewModel';

interface CrearEmpleadoForm {
  nombre: string;
  email: string;
  password: string;
  idRol: RolEmpleado | null;
  idDepartamento: number | null;
}

type FormErrors = Partial<Record<keyof CrearEmpleadoForm, string>>;

/** Coordina solo la creación; las dependencias las proporciona la composición. */
export function useCrearEmpleadoViewModel(
  gestion: Pick<IEmpleadoGestionService, 'crearEmpleado'>,
  catalogo: IDepartamentoConsultaService,
  onCreado?: (empleado: Empleado) => void
) {
  const [form, setForm] = useState<CrearEmpleadoForm>({
    nombre: '', email: '', password: '', idRol: null, idDepartamento: null,
  });
  const catalogoVM = useDepartamentosViewModel(catalogo);
  const { departamentos, isLoadingDepartamentos, errorDepartamentos } = catalogoVM;
  const [errors, setErrors] = useState<FormErrors>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [empleadoCreado, setEmpleadoCreado] = useState<Empleado | null>(null);
  const envioEnCurso = useRef(false);
  const creacionTerminada = useRef(false);
  const montado = useRef(false);
  const creacionNotificada = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  useEffect(() => {
    if (empleadoCreado && onCreado && !creacionNotificada.current) {
      creacionNotificada.current = true;
      onCreado(empleadoCreado);
    }
  }, [empleadoCreado, onCreado]);

  function cambiarCampo<K extends keyof CrearEmpleadoForm>(campo: K, valor: CrearEmpleadoForm[K]) {
    if (envioEnCurso.current || creacionTerminada.current) return;
    setForm((actual) => ({ ...actual, [campo]: valor }));
    setErrors((actual) => ({ ...actual, [campo]: undefined }));
    setErrorEnvio(null);
  }

  function reintentarDepartamentos() {
    if (envioEnCurso.current || creacionTerminada.current) return;
    catalogoVM.reintentarDepartamentos();
  }

  function cambiarRol(valor: string) {
    cambiarCampo('idRol', valor === '2' ? 2 : valor === '3' ? 3 : null);
  }

  function cambiarDepartamento(valor: string) {
    const id = Number(valor);
    cambiarCampo('idDepartamento', Number.isSafeInteger(id) && id > 0 ? id : null);
  }

  const puedeEnviar = !isLoadingDepartamentos && !errorDepartamentos &&
    departamentos.length > 0 && !isSubmitting && !empleadoCreado;

  async function enviar(): Promise<Empleado | null> {
    if (envioEnCurso.current || creacionTerminada.current || !montado.current) return null;
    if (!puedeEnviar || !catalogoVM.estaDisponible()) {
      setErrorEnvio('Carga los departamentos antes de guardar el empleado.');
      return null;
    }

    const nuevosErrores: FormErrors = {};
    if (!form.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nuevosErrores.email = 'Escribe un correo electrónico válido.';
    }
    if (!form.password.trim()) nuevosErrores.password = 'La contraseña es obligatoria.';
    if (form.idRol !== 2 && form.idRol !== 3) nuevosErrores.idRol = 'Selecciona un rol permitido.';
    if (!departamentos.some((departamento) => departamento.idDepartamento === form.idDepartamento)) {
      nuevosErrores.idDepartamento = 'Selecciona un departamento disponible.';
    }
    setErrors(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return null;

    // La referencia evita dos POST antes del siguiente render de React.
    envioEnCurso.current = true;
    setIsSubmitting(true);
    setErrorEnvio(null);
    try {
      const empleado = await gestion.crearEmpleado({
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        idRol: form.idRol as RolEmpleado,
        idDepartamento: form.idDepartamento as number,
      });
      if (!montado.current) return null;
      creacionTerminada.current = true;
      setEmpleadoCreado(empleado);
      setForm((actual) => ({ ...actual, password: '' }));
      return empleado;
    } catch (error: unknown) {
      if (montado.current) {
        setErrorEnvio(error instanceof Error ? error.message : 'No se pudo crear el empleado.');
      }
      return null;
    } finally {
      envioEnCurso.current = false;
      if (montado.current) setIsSubmitting(false);
    }
  }

  return {
    form, errors, departamentos, isLoadingDepartamentos, errorDepartamentos,
    isSubmitting, errorEnvio, empleadoCreado, puedeEnviar,
    cambiarCampo, cambiarRol, cambiarDepartamento, reintentarDepartamentos, enviar,
  };
}
