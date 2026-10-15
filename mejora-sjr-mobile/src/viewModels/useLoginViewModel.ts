import { useEffect, useRef, useState } from 'react';
import type { CredencialesLogin, ErroresLogin } from '../models/Login';
import type { IInicioSesionService } from '../services/contracts/IInicioSesionService';

/** Validación de experiencia de usuario; el backend debe validar de nuevo. */
export function validarLogin(formulario: CredencialesLogin): ErroresLogin {
  const errores: ErroresLogin = {};
  const email = formulario.email.trim();
  if (!email) {
    errores.email = 'El correo es obligatorio.';
  } else if (email.length > 150) {
    errores.email = 'El correo no puede superar 150 caracteres.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errores.email = 'Ingresa un correo con formato válido.';
  }
  // Login comprueba presencia, no impone nuevas reglas de creación de contraseñas.
  if (!formulario.password.trim()) {
    errores.password = 'La contraseña es obligatoria.';
  }
  return errores;
}

export function useLoginViewModel(inicioSesionService: IInicioSesionService) {
  const [formulario, setFormulario] = useState<CredencialesLogin>({ email: '', password: '' });
  const [errores, setErrores] = useState<ErroresLogin>({});
  const [isLoading, setIsLoading] = useState(false);
  const enviando = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; };
  }, []);

  function cambiarCampo(campo: keyof CredencialesLogin, valor: string) {
    if (enviando.current) return;
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined, general: undefined }));
  }

  async function iniciarSesion(): Promise<boolean> {
    // El ref cambia inmediatamente: bloquea dos pulsaciones antes del siguiente render.
    if (enviando.current || !montado.current) return false;
    const erroresLocales = validarLogin(formulario);
    setErrores(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) return false;

    enviando.current = true;
    setIsLoading(true);
    try {
      await inicioSesionService.iniciar({
        email: formulario.email.trim().toLowerCase(),
        password: formulario.password,
      });
      if (!montado.current) return false;
      setFormulario({ email: '', password: '' });
      return true;
    } catch (error: unknown) {
      if (montado.current) {
        setErrores({
          general: error instanceof Error && error.message.trim()
            ? error.message
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.',
        });
      }
      return false;
    } finally {
      enviando.current = false;
      if (montado.current) setIsLoading(false);
    }
  }

  return { formulario, errores, isLoading, cambiarCampo, iniciarSesion };
}
