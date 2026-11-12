'use client';

import { useEffect, useRef, useState } from 'react';
import type { CambioPasswordDTO } from '../models/password.types';
import type { ICambioPasswordService } from '../services/contracts/ICambioPasswordService';
import type { AccesoConfiguracionViewModel } from './useAccesoConfiguracionViewModel';
import { bytesPassword, mensajePassword, resultadoPasswordIncierto } from './configuracionPassword.helpers';

type EstadoCambio = 'reposo' | 'enviando' | 'confirmado' | 'incierto';
type ErroresCambio = Partial<Record<keyof CambioPasswordDTO, string>>;
const vacio = (): CambioPasswordDTO => ({ passwordActual: '', passwordNueva: '', confirmarPassword: '' });

/** Solo cambio propio: estado del formulario, validación y coordinación con su contrato. */
export function useCambioPasswordViewModel(
  acceso: AccesoConfiguracionViewModel,
  servicio: ICambioPasswordService,
  onReautenticar: () => void | Promise<void>
) {
  const token = acceso.actor?.token ?? null;
  const [form, setForm] = useState<CambioPasswordDTO>(vacio);
  const [errors, setErrors] = useState<ErroresCambio>({});
  const [estado, setEstado] = useState<EstadoCambio>('reposo');
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [reautenticando, setReautenticando] = useState(false);
  const estadoRef = useRef<EstadoCambio>('reposo');
  const versionForm = useRef(0);
  const versionVista = versionForm.current;
  const operacion = useRef(0);
  const montado = useRef(false);
  const reautenticandoRef = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; operacion.current++; };
  }, []);

  useEffect(() => {
    operacion.current++;
    versionForm.current++;
    estadoRef.current = 'reposo';
    setForm(vacio()); setErrors({}); setEstado('reposo');
    setErrorEnvio(null); setMensajeExito(null);
  }, [token, servicio]);

  function cambiarCampo(campo: keyof CambioPasswordDTO, valor: string) {
    if (!montado.current || estadoRef.current !== 'reposo' || reautenticandoRef.current || !acceso.validarSesion(token)) return;
    versionForm.current++;
    setForm(actual => ({ ...actual, [campo]: valor }));
    setErrors(actual => ({ ...actual, [campo]: undefined }));
    setErrorEnvio(null);
  }

  async function enviar(): Promise<boolean> {
    if (!montado.current || estadoRef.current !== 'reposo' || reautenticandoRef.current ||
        versionVista !== versionForm.current || !acceso.validarSesion(token)) return false;
    const nuevos: ErroresCambio = {};
    if (!form.passwordActual) nuevos.passwordActual = 'Escribe tu contraseña actual.';
    else if (bytesPassword(form.passwordActual) > 1024) nuevos.passwordActual = 'La contraseña actual excede el tamaño permitido.';
    if (Array.from(form.passwordNueva).length < 8 || !form.passwordNueva.trim()) {
      nuevos.passwordNueva = 'Escribe una contraseña de al menos 8 caracteres.';
    } else if (bytesPassword(form.passwordNueva) > 72) nuevos.passwordNueva = 'La nueva contraseña no debe superar 72 bytes UTF-8.';
    else if (form.passwordNueva === form.passwordActual) nuevos.passwordNueva = 'La nueva contraseña debe ser diferente de la actual.';
    if (!form.confirmarPassword || form.confirmarPassword !== form.passwordNueva) nuevos.confirmarPassword = 'La confirmación debe coincidir con la nueva contraseña.';
    setErrors(nuevos);
    if (Object.keys(nuevos).length) return false;

    const idOperacion = ++operacion.current;
    estadoRef.current = 'enviando'; setEstado('enviando'); setErrorEnvio(null); setMensajeExito(null);
    try {
      await servicio.cambiarPassword({ ...form });
      if (!montado.current || idOperacion !== operacion.current || !acceso.validarSesion(token)) return false;
      versionForm.current++;
      estadoRef.current = 'confirmado'; setEstado('confirmado');
      setForm(vacio()); setErrors({}); setMensajeExito('Tu contraseña se actualizó correctamente.');
      return true;
    } catch (error: unknown) {
      if (!montado.current || idOperacion !== operacion.current || !acceso.validarSesion(token)) return false;
      estadoRef.current = resultadoPasswordIncierto(error) ? 'incierto' : 'reposo';
      setEstado(estadoRef.current);
      setErrorEnvio(mensajePassword(error, 'No se pudo confirmar el cambio de contraseña.'));
      acceso.notificarErrorAcceso(error, token!);
      return false;
    }
  }

  function nuevoCambio() {
    if (!montado.current || estadoRef.current !== 'confirmado' || !acceso.validarSesion(token)) return;
    versionForm.current++;
    estadoRef.current = 'reposo'; setEstado('reposo'); setMensajeExito(null);
  }

  async function volverAlLogin() {
    if (!montado.current || estadoRef.current === 'enviando' || reautenticandoRef.current) return;
    reautenticandoRef.current = true; setReautenticando(true);
    versionForm.current++;
    setForm(vacio()); setErrors({});
    try { await onReautenticar(); }
    catch (error: unknown) {
      if (montado.current) setErrorEnvio(mensajePassword(error, 'No se pudo cerrar la sesión. Intenta nuevamente.'));
    } finally {
      reautenticandoRef.current = false;
      if (montado.current) setReautenticando(false);
    }
  }

  return {
    form, errors, estado, errorEnvio, mensajeExito, reautenticando,
    isSubmitting: estado === 'enviando', resultadoDesconocido: estado === 'incierto',
    puedeEnviar: token !== null && estado === 'reposo' && !reautenticando,
    avisoIncierto: estado === 'incierto'
      ? 'No repitas el cambio: podría haberse guardado. Vuelve al login para comprobar el acceso con la nueva contraseña cuando el backend esté disponible.'
      : null,
    cambiarCampo, enviar, nuevoCambio, volverAlLogin,
  };
}
