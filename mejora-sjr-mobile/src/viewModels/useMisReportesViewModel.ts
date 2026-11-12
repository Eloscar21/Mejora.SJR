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

/** Consulta privada y estado de lista; no crea ni reenvía incidencias. */
export function useMisReportesViewModel({ consultaService, session, categorias, solicitudPendiente }: MisReportesDependencies) {
  const [visible, setVisible] = useState(false);
  const [version, setVersion] = useState(0);
  const [reportes, setReportes] = useState<ReporteCiudadano[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const filas = useMemo(() => (rol === 1 ? reportes : []).filter(reporte => reporte.idUsuario === idUsuario).map(reporte => ({
    reporte,
    categoriaNombre: categorias.find(cat => cat.idCategoria === reporte.idCategoria)?.nombre ?? 'Categoría #' + reporte.idCategoria,
    estadoNombre: ESTADOS_INCIDENCIA[reporte.idEstado as keyof typeof ESTADOS_INCIDENCIA]?.nombre ?? reporte.estadoNombre ?? 'Estado #' + reporte.idEstado,
    fechaTexto: new Date(reporte.fechaCreacion).toLocaleString('es-MX'),
    puedeConfirmar: solicitudPendiente !== null && coincideConBorrador(reporte, solicitudPendiente),
  })), [reportes, idUsuario, rol, categorias, solicitudPendiente]);

  const abrir = useCallback(() => { consultaVersionRef.current++; respuestaRef.current = null; setReportes([]); setError(null); setIsLoading(true); setVisible(true); setVersion(value => value + 1); }, []);
  const cerrar = useCallback(() => { consultaVersionRef.current++; respuestaRef.current = null; setVisible(false); }, []);
  const recargar = useCallback(() => { consultaVersionRef.current++; respuestaRef.current = null; setReportes([]); setError(null); setIsLoading(true); setVersion(value => value + 1); }, []);
  const obtenerReporteVerificado = useCallback((idIncidencia: number): ReporteCiudadano | null => {
    const respuesta = respuestaRef.current;
    if (!respuesta || respuesta.propietario !== propietarioRef.current) return null;
    return respuesta.reportes.find(reporte => reporte.idIncidencia === idIncidencia) ?? null;
  }, []);
  return { visible, abrir, cerrar, recargar, obtenerReporteVerificado, isLoading, error, filas, requiereComprobacion: solicitudPendiente !== null };
}
