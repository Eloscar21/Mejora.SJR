'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EstadoSolicitudPassword, SolicitudPassword } from '../models/password.types';
import type { ISolicitudPasswordConsultaService } from '../services/contracts/ISolicitudPasswordConsultaService';
import type { AccesoConfiguracionViewModel } from './useAccesoConfiguracionViewModel';
import { mensajePassword } from './configuracionPassword.helpers';

/** Lectura y filtros de la bandeja: no recibe métodos de aprobación o rechazo (ISP). */
export function useBandejaPasswordViewModel(acceso: AccesoConfiguracionViewModel, consulta: ISolicitudPasswordConsultaService) {
  const token = acceso.actor?.token ?? null;
  const puedeConsultar = acceso.actor?.idRol === 4;
  const [solicitudes, setSolicitudes] = useState<SolicitudPassword[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitudPassword>('PENDIENTE');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorListado, setErrorListado] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const epoch = useRef(0);
  const propietario = useRef<{ token: string | null; consulta: ISolicitudPasswordConsultaService } | null>(null);
  const respuesta = useRef<{ token: string; datos: SolicitudPassword[] } | null>(null);
  const resueltas = useRef(new Set<number>());
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; epoch.current++; respuesta.current = null; };
  }, []);

  useEffect(() => {
    const idCarga = ++epoch.current;
    respuesta.current = null;
    setErrorListado(null);
    if (!propietario.current || propietario.current.token !== token || propietario.current.consulta !== consulta) {
      propietario.current = { token, consulta };
      resueltas.current.clear();
      setSolicitudes([]); setFiltroTexto('');
      if (filtroEstado !== 'PENDIENTE') {
        setFiltroEstado('PENDIENTE'); setIsLoading(puedeConsultar);
        return;
      }
    }
    if (!token || !puedeConsultar || !acceso.validarSesion(token)) {
      setSolicitudes([]); setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void (async () => {
      try {
        const datos = await consulta.listarSolicitudes(filtroEstado);
        if (!montado.current || idCarga !== epoch.current || !acceso.validarSesion(token)) return;
        const lista = datos.filter(s => filtroEstado !== 'PENDIENTE' || !resueltas.current.has(s.idSolicitud))
          .map(s => ({ ...s }));
        respuesta.current = { token, datos: lista };
        setSolicitudes(lista);
      } catch (error: unknown) {
        if (!montado.current || idCarga !== epoch.current || !acceso.validarSesion(token)) return;
        setErrorListado(mensajePassword(error, 'No se pudieron consultar las solicitudes.'));
        acceso.notificarErrorAcceso(error, token);
      } finally {
        if (montado.current && idCarga === epoch.current) setIsLoading(false);
      }
    })();
    return () => { if (epoch.current === idCarga) epoch.current++; respuesta.current = null; };
  }, [token, puedeConsultar, filtroEstado, version, consulta, acceso.validarSesion, acceso.notificarErrorAcceso]);

  function cambiarEstado(estado: EstadoSolicitudPassword) {
    if (!puedeConsultar || !acceso.validarSesion(token) ||
        (estado !== 'PENDIENTE' && estado !== 'APROBADA' && estado !== 'RECHAZADA') || estado === filtroEstado) return;
    epoch.current++; respuesta.current = null;
    setIsLoading(true); setFiltroEstado(estado);
  }

  function cambiarTexto(texto: string) {
    if (puedeConsultar && acceso.validarSesion(token)) setFiltroTexto(texto);
  }

  const recargar = useCallback(() => {
    if (!token || !puedeConsultar || !acceso.validarSesion(token) || !montado.current) return;
    epoch.current++; respuesta.current = null;
    setIsLoading(true); setVersion(actual => actual + 1);
  }, [token, puedeConsultar, acceso.validarSesion]);

  const obtenerPendiente = useCallback((idSolicitud: number): SolicitudPassword | null => {
    if (!puedeConsultar || !token || !acceso.validarSesion(token) || respuesta.current?.token !== token || resueltas.current.has(idSolicitud)) return null;
    const encontrada = respuesta.current.datos.find(s => s.idSolicitud === idSolicitud && s.estado === 'PENDIENTE');
    return encontrada ? { ...encontrada } : null;
  }, [token, puedeConsultar, acceso.validarSesion]);

  const registrarResolucion = useCallback((idSolicitud: number) => {
    if (!token || !puedeConsultar || !acceso.validarSesion(token)) return;
    resueltas.current.add(idSolicitud);
    if (respuesta.current?.token === token) respuesta.current.datos = respuesta.current.datos.filter(s => s.idSolicitud !== idSolicitud);
    setSolicitudes(actual => actual.filter(s => s.idSolicitud !== idSolicitud));
    recargar();
  }, [token, puedeConsultar, acceso.validarSesion, recargar]);

  const filas = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    return solicitudes.filter(s => !texto || [s.nombreUsuario, s.email, s.rolNombre, s.departamentoNombre ?? '']
      .some(campo => campo.toLowerCase().includes(texto)));
  }, [solicitudes, filtroTexto]);

  return { puedeConsultar, filas, total: solicitudes.length, filtroEstado, filtroTexto, isLoading, errorListado,
    cambiarEstado, cambiarTexto, recargar, obtenerPendiente, registrarResolucion };
}
