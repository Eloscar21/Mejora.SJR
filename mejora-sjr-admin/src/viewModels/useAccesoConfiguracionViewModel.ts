'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IAuthService } from '../services/contracts/IAuthService';
import type { IObservadorSesion } from '../services/contracts/IObservadorSesion';
import { mensajePassword, statusPassword } from './configuracionPassword.helpers';

export interface ActorConfiguracion {
  token: string;
  idUsuario: number;
  idRol: 3 | 4;
  email: string;
  exp: number;
}

type Sesion = Pick<IAuthService, 'obtenerToken' | 'decodificarToken'>;

function leerActor(sesion: Sesion): ActorConfiguracion | null {
  try {
    const token = sesion.obtenerToken();
    const payload = token ? sesion.decodificarToken(token) : null;
    if (!token || !payload || !Number.isSafeInteger(payload.idUsuario) || payload.idUsuario <= 0 ||
        (payload.idRol !== 3 && payload.idRol !== 4) || !Number.isSafeInteger(payload.exp) ||
        payload.exp <= Date.now() / 1000 || typeof payload.email !== 'string' || !payload.email.trim()) return null;
    return { token, idUsuario: payload.idUsuario, idRol: payload.idRol, email: payload.email, exp: payload.exp };
  } catch { return null; }
}

/** Guarda el contexto visual; la firma y autorización real del JWT las verifica el backend. */
export function useAccesoConfiguracionViewModel(sesion: Sesion, observador: IObservadorSesion) {
  const [actor, setActor] = useState<ActorConfiguracion | null>(null);
  const [inicializando, setInicializando] = useState(true);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const actorRef = useRef<ActorConfiguracion | null>(null);
  const revocado = useRef<{ token: string; mensaje: string } | null>(null);
  const montado = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const actualizarSesion = useCallback((): void => {
    if (!montado.current) return;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const siguiente = leerActor(sesion);
    if (!siguiente || siguiente.token === revocado.current?.token) {
      actorRef.current = null;
      setActor(null);
      setErrorAcceso(siguiente && revocado.current
        ? revocado.current.mensaje
        : 'Tu sesión no permite acceder a configuración o ha expirado. Inicia sesión nuevamente.');
    } else {
      actorRef.current = siguiente;
      revocado.current = null;
      setActor(siguiente);
      setErrorAcceso(null);
      const espera = Math.max(1, Math.min(2147483647, siguiente.exp * 1000 - Date.now() + 1));
      timer.current = setTimeout(actualizarSesion, espera);
    }
    setInicializando(false);
  }, [sesion]);

  useEffect(() => {
    montado.current = true;
    actualizarSesion();
    const cancelar = observador.suscribir(actualizarSesion);
    return () => {
      montado.current = false;
      actorRef.current = null;
      if (timer.current !== null) clearTimeout(timer.current);
      cancelar();
    };
  }, [observador, actualizarSesion]);

  const validarSesion = useCallback((tokenEsperado: string | null): ActorConfiguracion | null => {
    if (!montado.current) return null;
    const actual = leerActor(sesion);
    if (!tokenEsperado || !actual || actual.token !== tokenEsperado ||
        actorRef.current?.token !== tokenEsperado || revocado.current?.token === tokenEsperado) {
      actualizarSesion();
      return null;
    }
    return actual;
  }, [sesion, actualizarSesion]);

  const notificarErrorAcceso = useCallback((error: unknown, tokenEsperado: string) => {
    const status = statusPassword(error);
    if ((status !== 401 && status !== 403) || !validarSesion(tokenEsperado)) return;
    revocado.current = { token: tokenEsperado, mensaje: mensajePassword(error, 'El servidor rechazó tus credenciales. Inicia sesión nuevamente.') };
    actualizarSesion();
  }, [validarSesion, actualizarSesion]);

  return { actor, inicializando, errorAcceso, validarSesion, notificarErrorAcceso, actualizarSesion };
}

export type AccesoConfiguracionViewModel = ReturnType<typeof useAccesoConfiguracionViewModel>;
