import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { UsuarioSession } from '../models/auth.types';
import type { Categoria } from '../models/catalogo.types';
import { ESTADOS_INCIDENCIA, type NuevaIncidenciaDTO } from '../models/incidencia.types';
import { coincideConBorrador, type ReporteCiudadano } from '../models/reporteCiudadano.types';
import type { IReporteConsultaService } from '../services/contracts/IReporteConsultaService';

interface MisReportesDependencies {
  consultaService: IReporteConsultaService;
  session: UsuarioSession | null;
  categorias: Categoria[];
  solicitudPendiente: NuevaIncidenciaDTO | null;
}

export type FiltroEstadoCiudadano = 'TODAS' | 'EN_CURSO' | 'ATENDIDAS';

export interface FilaReporteCiudadano {
  reporte: ReporteCiudadano;
  idEstado: number;
  categoriaNombre: string;
  estadoNombre: string;
  estadoColor: string;
  estadoBg: string;
  mensajeExplicativo: string;
  pasoActual: number;
  fotoInicialUrl: string | null;
  fechaTexto: string;
  puedeConfirmar: boolean;
}

/** Consulta privada y estado de lista; no crea ni reenvía incidencias. */
export function useMisReportesViewModel({ consultaService, session, categorias, solicitudPendiente }: MisReportesDependencies) {
  const [visible, setVisible] = useState(false);
  const [version, setVersion] = useState(0);
  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoCiudadano>('TODAS');

  const idUsuario = session?.idUsuario;
  const rol = session?.idRol;
  const propietarioRef = useRef<number | null>(null);
  propietarioRef.current = rol === 1 && idUsuario ? idUsuario : null;
  const respuestaRef = useRef<{ propietario: number; reportes: ReporteCiudadano[] } | null>(null);
  const consultaVersionRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    let activo = true;
    const consultaVersion = ++consultaVersionRef.current;
    respuestaRef.current = null;
    setReportes([]);
    setError(null);
    setIsLoading(true);
    const cargar = async () => {
      try {
        if (rol !== 1 || !Number.isSafeInteger(idUsuario) || !idUsuario || idUsuario <= 0) {
          setError('Inicia sesión como ciudadano para consultar tus reportes.');
          return;
        }
        const datos = await consultaService.listarMisReportes();
        if (activo && consultaVersion === consultaVersionRef.current) {
          const propios = datos.filter(reporte => reporte.idUsuario === idUsuario);
          respuestaRef.current = { propietario: idUsuario, reportes: propios };
          setReportes(propios);
        }
      } catch (fallo: unknown) {
        if (activo && consultaVersion === consultaVersionRef.current) setError(fallo instanceof Error ? fallo.message : 'No se pudieron consultar tus reportes.');
      } finally { if (activo && consultaVersion === consultaVersionRef.current) setIsLoading(false); }
    };
    void cargar();
    return () => { activo = false; consultaVersionRef.current++; respuestaRef.current = null; };
  }, [visible, version, consultaService, idUsuario, rol]);

  const todasLasFilas: FilaReporteCiudadano[] = useMemo(() => (rol === 1 ? reportes : []).filter(reporte => reporte.idUsuario === idUsuario).map(reporte => {
    const estadoConfig = ESTADOS_INCIDENCIA[reporte.idEstado as keyof typeof ESTADOS_INCIDENCIA] ?? {
      nombre: reporte.estadoNombre ?? 'Estado #' + reporte.idEstado,
      color: '#64748B',
      bg: '#F1F5F9',
    };

    let mensajeExplicativo = 'Tu reporte ha sido registrado en el sistema municipal.';
    let pasoActual = 1;

    switch (reporte.idEstado) {
      case 1:
        pasoActual = 1;
        mensajeExplicativo = 'Tu reporte fue recibido exitosamente y se encuentra en espera de asignación técnica por el departamento.';
        break;
      case 2:
        pasoActual = 2;
        mensajeExplicativo = 'El departamento municipal está evaluando los requerimientos y asignando la cuadrilla de atención.';
        break;
      case 3:
        pasoActual = 3;
        mensajeExplicativo = '¡Cuadrilla en campo! Personal operativo municipal está trabajando activamente en la atención del reporte.';
        break;
      case 4:
        pasoActual = 4;
        mensajeExplicativo = '¡Reporte atendido! La incidencia ha sido resuelta satisfactoriamente por el personal municipal.';
        break;
      case 5:
        pasoActual = 0;
        mensajeExplicativo = 'Reporte descartado o rechazado por no ser procedente o tratarse de un duplicado.';
        break;
      default:
        pasoActual = 1;
        mensajeExplicativo = 'Estado actual: ' + (reporte.estadoNombre || 'En seguimiento');
    }

    return {
      reporte,
      idEstado: reporte.idEstado,
      categoriaNombre: categorias.find(cat => cat.idCategoria === reporte.idCategoria)?.nombre ?? 'Categoría #' + reporte.idCategoria,
      estadoNombre: estadoConfig.nombre,
      estadoColor: estadoConfig.color,
      estadoBg: estadoConfig.bg,
      mensajeExplicativo,
      pasoActual,
      fotoInicialUrl: reporte.fotoInicialUrl ?? null,
      fechaTexto: new Date(reporte.fechaCreacion).toLocaleString('es-MX'),
      puedeConfirmar: solicitudPendiente !== null && coincideConBorrador(reporte, solicitudPendiente),
    };
  }), [reportes, idUsuario, rol, categorias, solicitudPendiente]);

  const conteoEstados = useMemo(() => {
    const total = todasLasFilas.length;
    const recibidas = todasLasFilas.filter(f => f.idEstado === 1).length;
    const enRevision = todasLasFilas.filter(f => f.idEstado === 2).length;
    const enProgreso = todasLasFilas.filter(f => f.idEstado === 3).length;
    const atendidas = todasLasFilas.filter(f => f.idEstado === 4).length;
    const rechazadas = todasLasFilas.filter(f => f.idEstado === 5).length;
    const enSeguimiento = todasLasFilas.filter(f => [1, 2, 3].includes(f.idEstado)).length;
    return { total, recibidas, enRevision, enProgreso, atendidas, rechazadas, enSeguimiento };
  }, [todasLasFilas]);

  const filas = useMemo(() => {
    if (filtroEstado === 'EN_CURSO') {
      return todasLasFilas.filter(f => [1, 2, 3].includes(f.idEstado));
    }
    if (filtroEstado === 'ATENDIDAS') {
      return todasLasFilas.filter(f => f.idEstado === 4);
    }
    return todasLasFilas;
  }, [todasLasFilas, filtroEstado]);

  const abrir = useCallback(() => {
    consultaVersionRef.current++;
    respuestaRef.current = null;
    setReportes([]);
    setError(null);
    setFiltroEstado('TODAS');
    setIsLoading(true);
    setVisible(true);
    setVersion(value => value + 1);
  }, []);

  const cerrar = useCallback(() => {
    consultaVersionRef.current++;
    respuestaRef.current = null;
    setVisible(false);
  }, []);

  const recargar = useCallback(() => {
    consultaVersionRef.current++;
    respuestaRef.current = null;
    setReportes([]);
    setError(null);
    setIsLoading(true);
    setVersion(value => value + 1);
  }, []);

  const obtenerReporteVerificado = useCallback((idIncidencia: number): ReporteCiudadano | null => {
    const respuesta = respuestaRef.current;
    if (!respuesta || respuesta.propietario !== propietarioRef.current) return null;
    return respuesta.reportes.find(reporte => reporte.idIncidencia === idIncidencia) ?? null;
  }, []);

  return {
    visible,
    abrir,
    cerrar,
    recargar,
    obtenerReporteVerificado,
    isLoading,
    error,
    filas,
    conteoEstados,
    filtroEstado,
    setFiltroEstado,
    requiereComprobacion: solicitudPendiente !== null,
  };
}
