'use client';

import { useEffect, useRef, useState } from 'react';
import type { EstadoSolicitudPassword, SolicitudPassword, SolicitudPasswordAprobada } from '../models/password.types';
import type { ICopiadoService } from '../services/contracts/ICopiadoService';
import type { ISolicitudPasswordConsultaService } from '../services/contracts/ISolicitudPasswordConsultaService';
import type { ISolicitudPasswordGestionService } from '../services/contracts/ISolicitudPasswordGestionService';
import type { AccesoConfiguracionViewModel } from './useAccesoConfiguracionViewModel';
import { mensajePassword, resultadoPasswordIncierto, statusPassword } from './configuracionPassword.helpers';

type Tipo = 'aprobar' | 'rechazar';
type Estado = 'reposo' | 'enviando' | 'incierto' | 'reintentoDisponible' | 'confirmado' | 'verificado';
interface Borrador { tipo: Tipo; solicitud: SolicitudPassword; notas: string; motivo: string; }
interface SinConfirmar { idSolicitud: number; nombreUsuario: string; tipo: Tipo; }

/** Coordina únicamente la resolución: confirmación, comprobación y entrega de la clave. */
export function useResolucionPasswordViewModel(
  acceso: AccesoConfiguracionViewModel,
  gestion: ISolicitudPasswordGestionService,
  consulta: ISolicitudPasswordConsultaService,
  obtenerPendiente: (id: number) => SolicitudPassword | null,
  registrarResolucion: (id: number) => void,
  copiado?: ICopiadoService
) {
  const token = acceso.actor?.token ?? null;
  const [seleccion, setSeleccion] = useState<{ tipo: Tipo; solicitud: SolicitudPassword } | null>(null);
  const [notas, setNotas] = useState('');
  const [motivo, setMotivo] = useState('');
  const [estado, setEstado] = useState<Estado>('reposo');
  const [error, setError] = useState<string | null>(null);
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [claveConfirmada, setClaveConfirmada] = useState<SolicitudPasswordAprobada | null>(null);
  const [comprobando, setComprobando] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [mensajeCopiado, setMensajeCopiado] = useState<string | null>(null);
  const [sinConfirmar, setSinConfirmar] = useState<SinConfirmar[]>([]);
  const borrador = useRef<Borrador | null>(null);
  const estadoRef = useRef<Estado>('reposo');
  const pendientes = useRef(new Map<number, Borrador>());
  const claveRef = useRef<SolicitudPasswordAprobada | null>(null);
  const comprobandoRef = useRef(false);
  const copiandoRef = useRef(false);
  const version = useRef(0);
  const versionVista = version.current;
  const operacion = useRef(0);
  const montado = useRef(false);

  function mover(siguiente: Estado) { estadoRef.current = siguiente; setEstado(siguiente); }
  function actualizarPendientes() {
    setSinConfirmar(Array.from(pendientes.current.values()).map(p => ({
      idSolicitud: p.solicitud.idSolicitud, nombreUsuario: p.solicitud.nombreUsuario, tipo: p.tipo,
    })));
  }
  function conservarIncierto() {
    if (borrador.current) pendientes.current.set(borrador.current.solicitud.idSolicitud, { ...borrador.current });
    actualizarPendientes();
  }
  function autorizado() { return acceso.validarSesion(token)?.idRol === 4; }
  function vigente(idOperacion: number) { return montado.current && idOperacion === operacion.current && autorizado(); }

  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; operacion.current++; claveRef.current = null; pendientes.current.clear(); };
  }, []);

  useEffect(() => {
    operacion.current++; version.current++;
    borrador.current = null; claveRef.current = null; pendientes.current.clear();
    estadoRef.current = 'reposo'; comprobandoRef.current = false; copiandoRef.current = false;
    setSeleccion(null); setNotas(''); setMotivo(''); setEstado('reposo');
    setError(null); setErrorCampo(null); setMensaje(null); setClaveConfirmada(null);
    setComprobando(false); setCopiando(false); setMensajeCopiado(null); setSinConfirmar([]);
  }, [token, gestion, consulta]);

  function cargarBorrador(datos: Borrador, incierto: boolean) {
    operacion.current++; version.current++;
    borrador.current = { ...datos, solicitud: { ...datos.solicitud } };
    setSeleccion({ tipo: datos.tipo, solicitud: { ...datos.solicitud } });
    setNotas(datos.notas); setMotivo(datos.motivo); setError(null); setErrorCampo(null); setMensaje(null);
    claveRef.current = null; setClaveConfirmada(null); setMensajeCopiado(null);
    mover(incierto ? 'incierto' : 'reposo');
  }

  function abrir(tipo: Tipo, id: number): boolean {
    if (!montado.current || borrador.current || !autorizado() || (tipo !== 'aprobar' && tipo !== 'rechazar')) return false;
    const pendiente = pendientes.current.get(id);
    if (pendiente) { cargarBorrador(pendiente, true); return true; }
    const solicitud = obtenerPendiente(id);
    if (!solicitud) return false;
    cargarBorrador({ tipo, solicitud, notas: '', motivo: '' }, false);
    return true;
  }

  function revisarIncierto(id: number): boolean {
    const datos = pendientes.current.get(id);
    if (!datos || !montado.current || borrador.current || !autorizado()) return false;
    cargarBorrador(datos, true);
    return true;
  }

  function cambiarCampo(campo: 'notas' | 'motivo', valor: string) {
    if (!borrador.current || !autorizado() || comprobandoRef.current || copiandoRef.current ||
        (estadoRef.current !== 'reposo' && estadoRef.current !== 'reintentoDisponible')) return;
    version.current++;
    borrador.current = { ...borrador.current, [campo]: valor };
    if (campo === 'notas') setNotas(valor); else setMotivo(valor);
    setErrorCampo(null); setError(null);
    if (pendientes.current.has(borrador.current.solicitud.idSolicitud)) conservarIncierto();
  }

  async function confirmar(): Promise<boolean> {
    const datos = borrador.current;
    if (!montado.current || !datos || !autorizado() || versionVista !== version.current ||
        comprobandoRef.current || copiandoRef.current ||
        (estadoRef.current !== 'reposo' && estadoRef.current !== 'reintentoDisponible')) return false;
    const reintento = estadoRef.current === 'reintentoDisponible';
    if (!reintento) {
      const actual = obtenerPendiente(datos.solicitud.idSolicitud);
      if (!actual || actual.idUsuario !== datos.solicitud.idUsuario) {
        setError('El listado cambió. Cierra el diálogo y actualiza la bandeja antes de continuar.');
        return false;
      }
    }
    if (datos.tipo === 'aprobar' && datos.notas.trim().length > 255) {
      setErrorCampo('Las notas no deben superar 255 caracteres.'); return false;
    }
    if (datos.tipo === 'rechazar' && (datos.motivo.trim().length < 5 || datos.motivo.trim().length > 255)) {
      setErrorCampo('Escribe un motivo de entre 5 y 255 caracteres.'); return false;
    }

    const idOperacion = ++operacion.current;
    mover('enviando'); setError(null); setErrorCampo(null); setMensaje(null); setMensajeCopiado(null);
    try {
      if (datos.tipo === 'aprobar') {
        const resultado = await gestion.aprobarSolicitud(datos.solicitud.idSolicitud,
          datos.notas.trim() ? { notas: datos.notas.trim() } : {});
        if (!vigente(idOperacion)) return false;
        if (resultado.idSolicitud !== datos.solicitud.idSolicitud || resultado.email !== datos.solicitud.email) {
          throw Object.assign(new Error('La confirmación no corresponde al solicitante. Consulta el estado del ticket.'), { resultadoDesconocido: true });
        }
        claveRef.current = { ...resultado }; setClaveConfirmada({ ...resultado });
        setMensaje('Solicitud aprobada. Entrega la clave temporal al empleado por el medio acordado con el equipo.');
      } else {
        await gestion.rechazarSolicitud(datos.solicitud.idSolicitud, { motivo: datos.motivo.trim() });
        if (!vigente(idOperacion)) return false;
        setMensaje('Solicitud rechazada correctamente.');
      }
      version.current++;
      pendientes.current.delete(datos.solicitud.idSolicitud); actualizarPendientes();
      mover('confirmado'); registrarResolucion(datos.solicitud.idSolicitud);
      return true;
    } catch (fallo: unknown) {
      if (!vigente(idOperacion)) return false;
      const status = statusPassword(fallo);
      if (reintento || resultadoPasswordIncierto(fallo) || status === 409 || status === 404) {
        conservarIncierto(); mover('incierto');
      } else mover('reposo');
      setError(mensajePassword(fallo, 'No se pudo confirmar la resolución. Consulta el estado antes de continuar.'));
      acceso.notificarErrorAcceso(fallo, token!);
      return false;
    }
  }

  async function comprobarResultado(): Promise<void> {
    const datos = borrador.current;
    if (!montado.current || !datos || !autorizado() || comprobandoRef.current || copiandoRef.current ||
        (estadoRef.current !== 'incierto' && estadoRef.current !== 'reintentoDisponible')) return;
    const idOperacion = ++operacion.current;
    comprobandoRef.current = true; setComprobando(true);
    version.current++; mover('incierto'); setError(null); setMensaje(null);
    try {
      const estados: EstadoSolicitudPassword[] = ['PENDIENTE', 'APROBADA', 'RECHAZADA'];
      const listas = await Promise.all(estados.map(estado => consulta.listarSolicitudes(estado)));
      if (!vigente(idOperacion)) return;
      const coincidencias = listas.flat().filter(s => s.idSolicitud === datos.solicitud.idSolicitud);
      if (coincidencias.some(s => s.idUsuario !== datos.solicitud.idUsuario)) throw new Error('La consulta no corresponde al solicitante.');
      const resueltas = coincidencias.filter(s => s.estado !== 'PENDIENTE');
      if (resueltas.length === 1) {
        pendientes.current.delete(datos.solicitud.idSolicitud); actualizarPendientes();
        mover('verificado');
        setMensaje(resueltas[0].estado === 'APROBADA'
          ? 'La solicitud está aprobada. La consulta no recupera su clave temporal. Si nadie recibió esa clave, el empleado deberá solicitar otra recuperación.'
          : 'La solicitud está rechazada. Se comprobó su estado sin reenviar la operación.');
        registrarResolucion(datos.solicitud.idSolicitud);
      } else if (resueltas.length === 0 && coincidencias.some(s => s.estado === 'PENDIENTE')) {
        mover('reintentoDisponible');
        setMensaje('El ticket aparecía pendiente al consultar. La petición anterior podría seguir en curso. Puedes reintentar manualmente; la solicitud solo se podrá atender una vez.');
      } else {
        setMensaje('Todavía no se pudo determinar el resultado. Conserva el ticket y vuelve a consultar; no se reenvió ninguna operación.');
      }
    } catch (fallo: unknown) {
      if (vigente(idOperacion)) {
        setError(mensajePassword(fallo, 'No se pudo comprobar el estado de la solicitud.'));
        acceso.notificarErrorAcceso(fallo, token!);
      }
    } finally {
      if (montado.current && idOperacion === operacion.current) {
        comprobandoRef.current = false; setComprobando(false);
      }
    }
  }

  function cerrar(): boolean {
    if (!montado.current || versionVista !== version.current || estadoRef.current === 'enviando' || comprobandoRef.current || copiandoRef.current) return false;
    if ((estadoRef.current === 'incierto' || estadoRef.current === 'reintentoDisponible') && borrador.current) conservarIncierto();
    operacion.current++; version.current++;
    borrador.current = null; claveRef.current = null;
    setSeleccion(null); setNotas(''); setMotivo(''); setClaveConfirmada(null);
    setError(null); setErrorCampo(null); setMensaje(null); setMensajeCopiado(null); mover('reposo');
    return true;
  }

  async function copiarClave(): Promise<boolean> {
    const clave = claveRef.current;
    if (!clave || estadoRef.current !== 'confirmado' || !autorizado() || copiandoRef.current || versionVista !== version.current) return false;
    copiandoRef.current = true; setCopiando(true); setMensajeCopiado(null);
    const idOperacion = operacion.current;
    try {
      if (!copiado) throw new Error('Selecciona la clave y cópiala manualmente.');
      await copiado.copiarTexto(clave.passwordTemporal);
      if (!vigente(idOperacion)) return false;
      setMensajeCopiado('Clave copiada.'); return true;
    } catch (fallo: unknown) {
      if (vigente(idOperacion)) setMensajeCopiado(mensajePassword(fallo, 'No se pudo copiar la clave.'));
      return false;
    } finally {
      if (montado.current && idOperacion === operacion.current) { copiandoRef.current = false; setCopiando(false); }
    }
  }

  return {
    seleccion, notas, motivo, estado, error, errorCampo, mensaje, claveConfirmada,
    comprobando, copiando, mensajeCopiado, sinConfirmar,
    isSubmitting: estado === 'enviando',
    puedeConfirmar: seleccion !== null && acceso.actor?.idRol === 4 && !comprobando && !copiando &&
      (estado === 'reposo' || estado === 'reintentoDisponible'),
    puedeComprobar: seleccion !== null && !comprobando && (estado === 'incierto' || estado === 'reintentoDisponible'),
    abrir, revisarIncierto, cambiarNotas: (valor: string) => cambiarCampo('notas', valor),
    cambiarMotivo: (valor: string) => cambiarCampo('motivo', valor), confirmar, comprobarResultado, cerrar, copiarClave,
  };
}
