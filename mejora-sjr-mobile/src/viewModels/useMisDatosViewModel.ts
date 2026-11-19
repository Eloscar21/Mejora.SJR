/**
 * useMisDatosViewModel.ts
 * ViewModel para el apartado "Mis Datos" / Perfil Ciudadano en App Móvil (US-032).
 *
 * Implementa el patrón MVVM:
 * - Consume IPerfilService (DIP) para consultar y actualizar los datos personales del ciudadano.
 * - Valida nombre completo, correo electrónico y cambio opcional de contraseña.
 * - Sincroniza en tiempo real la sesión activa en la app móvil cuando el ciudadano guarda sus cambios.
 */

import { useCallback, useEffect, useState } from 'react';
import type { UsuarioSession } from '../models/auth.types';
import type { PerfilCiudadano, PerfilFormErrors } from '../models/perfil.types';
import type { IPerfilService } from '../services/contracts/IPerfilService';

export interface MisDatosViewModelDependencies {
  perfilService: IPerfilService;
  session: UsuarioSession | null;
  onActualizarSesion?: (nuevaSesion: UsuarioSession) => void;
  onCerrarSesion?: () => Promise<void>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function useMisDatosViewModel({
  perfilService,
  session,
  onActualizarSesion,
  onCerrarSesion,
}: MisDatosViewModelDependencies) {
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [perfil, setPerfil] = useState<PerfilCiudadano | null>(null);
  const [nombre, setNombre] = useState(session?.nombre || '');
  const [email, setEmail] = useState(session?.email || '');

  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  const [errors, setErrors] = useState<PerfilFormErrors>({});
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Sincronizar valores base cuando cambia la sesión externa
  useEffect(() => {
    if (session && !visible) {
      setNombre(session.nombre || '');
      setEmail(session.email || '');
    }
  }, [session, visible]);

  const cargarPerfil = useCallback(async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const datos = await perfilService.obtenerPerfil();
      setPerfil(datos);
      setNombre(datos.nombre);
      setEmail(datos.email);
    } catch (err: unknown) {
      if (session) {
        setPerfil({
          idUsuario: session.idUsuario,
          nombre: session.nombre,
          email: session.email,
          idRol: session.idRol,
          rolNombre: 'Ciudadano',
          idDepartamento: session.idDepartamento,
          activo: true,
          resumenReportes: { total: 0, recibidos: 0, enProceso: 0, resueltos: 0 },
        });
        setNombre(session.nombre);
        setEmail(session.email);
      } else {
        setErrors({
          general:
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar tus datos personales.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [perfilService, session]);

  const abrir = useCallback(() => {
    setVisible(true);
    setMensajeExito(null);
    setErrors({});
    setMostrarCambioPassword(false);
    setPasswordActual('');
    setPasswordNueva('');
    setConfirmarPassword('');
    void cargarPerfil();
  }, [cargarPerfil]);

  const cerrar = useCallback(() => {
    if (isSaving) return;
    setVisible(false);
    setMensajeExito(null);
    setErrors({});
  }, [isSaving]);

  const toggleCambioPassword = useCallback(() => {
    setMostrarCambioPassword((prev) => {
      const siguiente = !prev;
      if (!siguiente) {
        setPasswordActual('');
        setPasswordNueva('');
        setConfirmarPassword('');
      }
      return siguiente;
    });
    setErrors((prev) => ({
      ...prev,
      passwordActual: undefined,
      passwordNueva: undefined,
      confirmarPassword: undefined,
    }));
  }, []);

  const validarFormulario = useCallback((): boolean => {
    const nuevosErrores: PerfilFormErrors = {};
    const nombreLimpio = nombre.trim().replace(/\s+/g, ' ');
    const emailLimpio = email.trim().toLowerCase();

    if (nombreLimpio.length < 3) {
      nuevosErrores.nombre = 'El nombre completo debe tener al menos 3 caracteres.';
    } else if (nombreLimpio.length > 150) {
      nuevosErrores.nombre = 'El nombre no puede exceder 150 caracteres.';
    }

    if (!emailLimpio || !EMAIL_REGEX.test(emailLimpio)) {
      nuevosErrores.email = 'Ingresa un correo electrónico válido.';
    }

    if (mostrarCambioPassword) {
      if (!passwordActual) {
        nuevosErrores.passwordActual = 'Ingresa tu contraseña actual.';
      }
      if (!passwordNueva || passwordNueva.length < 8) {
        nuevosErrores.passwordNueva = 'La nueva contraseña debe tener al menos 8 caracteres.';
      } else if (passwordNueva === passwordActual) {
        nuevosErrores.passwordNueva = 'La nueva contraseña debe ser distinta a la actual.';
      }
      if (confirmarPassword !== passwordNueva) {
        nuevosErrores.confirmarPassword = 'La confirmación no coincide con la nueva contraseña.';
      }
    }

    setErrors(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }, [
    nombre,
    email,
    mostrarCambioPassword,
    passwordActual,
    passwordNueva,
    confirmarPassword,
  ]);

  const guardarCambios = useCallback(async () => {
    if (isSaving) return;
    setMensajeExito(null);

    if (!validarFormulario()) {
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      const resultado = await perfilService.actualizarPerfil({
        nombre: nombre.trim().replace(/\s+/g, ' '),
        email: email.trim().toLowerCase(),
        ...(mostrarCambioPassword
          ? {
              passwordActual,
              passwordNueva,
              confirmarPassword,
            }
          : {}),
      });

      setPerfil(resultado.usuario);
      setNombre(resultado.usuario.nombre);
      setEmail(resultado.usuario.email);
      setMensajeExito(resultado.mensaje);

      if (mostrarCambioPassword) {
        setMostrarCambioPassword(false);
        setPasswordActual('');
        setPasswordNueva('');
        setConfirmarPassword('');
      }

      if (onActualizarSesion) {
        onActualizarSesion({
          idUsuario: resultado.usuario.idUsuario,
          nombre: resultado.usuario.nombre,
          email: resultado.usuario.email,
          idRol: resultado.usuario.idRol,
          idDepartamento: resultado.usuario.idDepartamento,
        });
      }
    } catch (err: unknown) {
      setErrors({
        general:
          err instanceof Error
            ? err.message
            : 'No fue posible guardar los cambios en tu perfil.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    validarFormulario,
    perfilService,
    nombre,
    email,
    mostrarCambioPassword,
    passwordActual,
    passwordNueva,
    confirmarPassword,
    onActualizarSesion,
  ]);

  const iniciales = (nombre || session?.nombre || 'Ciudadano')
    .trim()
    .split(/\s+/)
    .map((p) => p[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return {
    visible,
    isLoading,
    isSaving,
    perfil,
    iniciales,

    nombre,
    setNombre,
    email,
    setEmail,

    mostrarCambioPassword,
    toggleCambioPassword,
    passwordActual,
    setPasswordActual,
    passwordNueva,
    setPasswordNueva,
    confirmarPassword,
    setConfirmarPassword,

    errors,
    mensajeExito,

    abrir,
    cerrar,
    recargarPerfil: cargarPerfil,
    guardarCambios,
    cerrarSesion: onCerrarSesion,
  };
}
