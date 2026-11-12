import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { UsuarioSession } from '../models/auth.types';
import type { Departamento, Categoria, PickerItem } from '../models/catalogo.types';
import type { NuevaIncidenciaDTO, ReporteCreado } from '../models/incidencia.types';
import type { FotoReporteEjemplo } from '../models/reporteEjemplo.types';
import { coincideConBorrador, type ReporteCiudadano } from '../models/reporteCiudadano.types';
import type { ICatalogoService } from '../services/contracts/ICatalogoService';
import type { IReporteSubmissionService } from '../services/contracts/IReporteSubmissionService';
import type { IReporteEjemploService } from '../services/contracts/IReporteEjemploService';

export interface ReporteErrors {
  departamento?: string;
  categoria?: string;
  descripcion?: string;
  foto?: string;
  general?: string;
}

export interface ReporteViewModelDependencies {
  catalogoService: ICatalogoService;
  submissionService: IReporteSubmissionService;
  ejemplosService: IReporteEjemploService;
  session: UsuarioSession | null;
  onCerrarSesion: () => Promise<void>;
  onPendienteChange?: (datos: NuevaIncidenciaDTO | null) => void;
}

type EstadoEnvio = 'idle' | 'pending' | 'unknown' | 'confirmed';
type EstadoFoto = 'idle' | 'loading' | 'ready' | 'error';

/** Coordina el formulario mediante contratos; las entradas de ejemplo no simulan el guardado. */
export function useReporteViewModel({
  catalogoService, submissionService, ejemplosService, session, onCerrarSesion, onPendienteChange,
}: ReporteViewModelDependencies) {
  const activoRef = useRef(true);
  const catalogoVersionRef = useRef(0);
  const envioRef = useRef<EstadoEnvio>('idle');
  const fotoVersionRef = useRef(0);
  const fotoActualRef = useRef<{ foto: FotoReporteEjemplo; intento: number } | null>(null);
  const solicitudPendienteRef = useRef<NuevaIncidenciaDTO | null>(null);
  const formularioVersionRef = useRef(0);
  const versionFormulario = formularioVersionRef.current;
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null);
  const [selectedDepartamento, setSelectedDepartamento] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [fotoEvidencia, setFotoEvidencia] = useState<FotoReporteEjemplo | null>(null);
  const [fotoIntento, setFotoIntento] = useState(0);
  const [estadoFoto, setEstadoFoto] = useState<EstadoFoto>('idle');
  const [errors, setErrors] = useState<ReporteErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultadoDesconocido, setResultadoDesconocido] = useState(false);
  const [reporteCreado, setReporteCreado] = useState<ReporteCreado | null>(null);
  const [mensajeComprobacion, setMensajeComprobacion] = useState<string | null>(null);
  const ubicacion = useMemo(() => ejemplosService.obtenerUbicacion(), [ejemplosService]);

  useEffect(() => {
    activoRef.current = true;
    return () => {
      activoRef.current = false;
      catalogoVersionRef.current++;
    };
  }, []);

  const cerrarSesion = useCallback(async () => {
    try { await onCerrarSesion(); } catch {
      // AuthProvider representa el fallo y bloquea el login hasta completar el cierre.
    }
  }, [onCerrarSesion]);

  const limpiarError = useCallback((campo: keyof ReporteErrors) => {
    setErrors(prev => { const next = { ...prev }; delete next[campo]; return next; });
  }, []);

  const limpiarFoto = useCallback(() => {
    fotoActualRef.current = null;
    setFotoIntento(++fotoVersionRef.current);
    setFotoEvidencia(null);
    setEstadoFoto('idle');
    limpiarError('foto');
  }, [limpiarError]);

  const cargarCatalogos = useCallback(async () => {
    if (envioRef.current !== 'idle') return;
    const version = ++catalogoVersionRef.current;
    setIsLoadingCatalogos(true);
    setErrorCatalogos(null);
    try {
      const [deptos, cats] = await Promise.all([
        catalogoService.obtenerDepartamentos(), catalogoService.obtenerCategorias(),
      ]);
      if (!activoRef.current || version !== catalogoVersionRef.current) return;
      setDepartamentos(deptos);
      setCategorias(cats);
    } catch (error: unknown) {
      if (activoRef.current && version === catalogoVersionRef.current) {
        setErrorCatalogos(error instanceof Error ? error.message : 'No se pudieron cargar los catálogos.');
      }
    } finally {
      if (activoRef.current && version === catalogoVersionRef.current) setIsLoadingCatalogos(false);
    }
  }, [catalogoService]);

  useEffect(() => { void cargarCatalogos(); }, [cargarCatalogos]);

  const departamentosItems = useMemo<PickerItem<number>[]>(() => departamentos.map(depto => ({
    label: depto.nombre, value: depto.idDepartamento,
  })), [departamentos]);

  const categoriasItems = useMemo<PickerItem<number>[]>(() => {
    const visibles = selectedDepartamento ? categorias.filter(cat => cat.idDepartamento === selectedDepartamento) : categorias;
    return visibles.map(cat => ({ label: cat.nombre, value: cat.idCategoria, extraInfo: cat.departamentoNombre }));
  }, [categorias, selectedDepartamento]);

  const handleDepartamentoChange = useCallback((idDepartamento: number) => {
    if (envioRef.current !== 'idle') return;
    if (!departamentos.some(depto => depto.idDepartamento === idDepartamento)) return;
    setSelectedDepartamento(idDepartamento);
    const categoria = categorias.find(cat => cat.idCategoria === selectedCategoria);
    if (categoria && categoria.idDepartamento !== idDepartamento) {
      setSelectedCategoria(null);
      limpiarFoto();
    }
    limpiarError('departamento');
  }, [departamentos, categorias, selectedCategoria, limpiarFoto, limpiarError]);

  const handleCategoriaChange = useCallback((idCategoria: number) => {
    if (envioRef.current !== 'idle') return;
    const categoria = categorias.find(cat => cat.idCategoria === idCategoria);
    if (!categoria) return;
    if (idCategoria !== selectedCategoria) limpiarFoto();
    setSelectedCategoria(idCategoria);
    setSelectedDepartamento(categoria.idDepartamento);
    limpiarError('categoria');
    limpiarError('departamento');
  }, [categorias, selectedCategoria, limpiarFoto, limpiarError]);

  const handleDescripcionChange = useCallback((text: string) => {
    if (envioRef.current !== 'idle') return;
    setDescripcion(text);
    limpiarError('descripcion');
  }, [limpiarError]);

  const handleAdjuntarFoto = useCallback(() => {
    if (envioRef.current !== 'idle') return;
    const categoria = categorias.find(cat => cat.idCategoria === selectedCategoria);
    if (!categoria) {
      setErrors(prev => ({ ...prev, categoria: 'Selecciona una categoría antes de añadir su foto de ejemplo.' }));
      return;
    }
    const foto = ejemplosService.obtenerFoto(categoria);
    if (!foto) {
      setErrors(prev => ({ ...prev, foto: 'Esta categoría todavía no tiene una imagen de ejemplo. Puedes enviar sin foto.' }));
      return;
    }
    const intento = ++fotoVersionRef.current;
    fotoActualRef.current = { foto, intento };
    setFotoIntento(intento);
    setFotoEvidencia(foto);
    setEstadoFoto('loading');
    limpiarError('foto');
  }, [categorias, selectedCategoria, ejemplosService, limpiarError]);

  const handleEliminarFoto = useCallback(() => {
    if (envioRef.current === 'idle') limpiarFoto();
  }, [limpiarFoto]);

  const handleFotoCargada = useCallback((intento: number) => {
    if (!activoRef.current || fotoActualRef.current?.intento !== intento) return;
    setEstadoFoto('ready');
    limpiarError('foto');
  }, [limpiarError]);

  const handleFotoError = useCallback((intento: number) => {
    if (!activoRef.current || fotoActualRef.current?.intento !== intento) return;
    setEstadoFoto('error');
    setErrors(prev => ({ ...prev, foto: 'No se pudo cargar la imagen de ejemplo. Puedes enviar el reporte sin foto.' }));
  }, []);

  const handleReintentarFoto = useCallback(() => {
    if (envioRef.current !== 'idle' || !fotoActualRef.current) return;
    const intento = ++fotoVersionRef.current;
    fotoActualRef.current = { foto: fotoActualRef.current.foto, intento };
    setFotoIntento(intento);
    setEstadoFoto('loading');
    limpiarError('foto');
  }, [limpiarError]);

  const sesionCiudadana = session?.idRol === 1 && Number.isSafeInteger(session.idUsuario) && session.idUsuario > 0;
  const formularioBloqueado = isSubmitting || resultadoDesconocido || reporteCreado !== null;
  const catalogosDisponibles = departamentos.length > 0 && categorias.length > 0;
  const puedeAdjuntarFoto = !formularioBloqueado && selectedCategoria !== null;
  const puedeEnviar = sesionCiudadana && !formularioBloqueado && !isLoadingCatalogos && !errorCatalogos && catalogosDisponibles;

  const handleSubmitReporte = useCallback(async () => {
    if (!activoRef.current || envioRef.current !== 'idle' || versionFormulario !== formularioVersionRef.current) return;
    const newErrors: ReporteErrors = {};
    const categoria = categorias.find(cat => cat.idCategoria === selectedCategoria);
    if (!departamentos.some(depto => depto.idDepartamento === selectedDepartamento)) {
      newErrors.departamento = 'Selecciona un departamento del catálogo.';
    }
    if (!categoria || categoria.idDepartamento !== selectedDepartamento) {
      newErrors.categoria = 'Selecciona una categoría válida del departamento.';
    }
    if (descripcion.trim().length < 10) newErrors.descripcion = 'La descripción debe tener al menos 10 caracteres.';
    if (!sesionCiudadana) newErrors.general = 'Inicia sesión como ciudadano para enviar reportes.';
    if (isLoadingCatalogos || errorCatalogos || !catalogosDisponibles) {
      newErrors.general = 'Necesitamos cargar los catálogos antes de enviar.';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const datos: NuevaIncidenciaDTO = {
      descripcion: descripcion.trim(),
      idCategoria: selectedCategoria!,
      latitud: ubicacion.latitud,
      longitud: ubicacion.longitud,
      ...(fotoEvidencia && estadoFoto === 'ready' ? { fotoUrl: fotoEvidencia.url } : {}),
    };
    envioRef.current = 'pending';
    solicitudPendienteRef.current = datos;
    setMensajeComprobacion(null);
    setIsSubmitting(true);
    try {
      const creado = await submissionService.crearReporte(datos);
      if (!activoRef.current) return;
      envioRef.current = 'confirmed';
      formularioVersionRef.current++;
      solicitudPendienteRef.current = null;
      onPendienteChange?.(null);
      setReporteCreado(creado);
      setSelectedDepartamento(null);
      setSelectedCategoria(null);
      setDescripcion('');
      limpiarFoto();
      setErrors({});
    } catch (error: unknown) {
      if (!activoRef.current) return;
      const desconocido = typeof error === 'object' && error !== null &&
        'resultadoDesconocido' in error && error.resultadoDesconocido === true;
      envioRef.current = desconocido ? 'unknown' : 'idle';
      solicitudPendienteRef.current = desconocido ? datos : null;
      onPendienteChange?.(desconocido ? datos : null);
      setResultadoDesconocido(desconocido);
      setErrors({ general: desconocido
        ? 'No pudimos confirmar el guardado. Conservamos tus datos; comprueba Mis reportes antes de volver a enviar.'
        : error instanceof Error ? error.message : 'No se pudo guardar el reporte. Conservamos tus datos.' });
    } finally {
      if (activoRef.current) setIsSubmitting(false);
    }
  }, [categorias, departamentos, selectedCategoria, selectedDepartamento, descripcion, sesionCiudadana,
    isLoadingCatalogos, errorCatalogos, catalogosDisponibles, fotoEvidencia, estadoFoto, ubicacion, submissionService, limpiarFoto, onPendienteChange, versionFormulario]);

  const confirmarReporteExistente = useCallback((reporte: ReporteCiudadano): boolean => {
    if (!activoRef.current || envioRef.current !== 'unknown' || !solicitudPendienteRef.current ||
      reporte.idUsuario !== session?.idUsuario || !coincideConBorrador(reporte, solicitudPendienteRef.current)) return false;
    envioRef.current = 'idle';
    formularioVersionRef.current++;
    solicitudPendienteRef.current = null;
    onPendienteChange?.(null);
    setResultadoDesconocido(false);
    setSelectedDepartamento(null);
    setSelectedCategoria(null);
    setDescripcion('');
    limpiarFoto();
    setErrors({});
    setMensajeComprobacion('Reporte #' + reporte.idIncidencia + ' comprobado en tu lista. No se volvió a enviar.');
    return true;
  }, [session?.idUsuario, limpiarFoto, onPendienteChange]);

  const cerrarModalExito = useCallback(() => {
    if (envioRef.current !== 'confirmed') return;
    envioRef.current = 'idle';
    setReporteCreado(null);
  }, []);

  return {
    session, departamentos, categorias, departamentosItems, categoriasItems,
    isLoadingCatalogos, errorCatalogos, catalogosDisponibles, selectedDepartamento, selectedCategoria, descripcion,
    coordenadas: { lat: ubicacion.latitud, lng: ubicacion.longitud },
    referenciaUbicacion: ubicacion.referencia,
    fotoEvidencia, fotoIntento, estadoFoto, errors, isSubmitting, formularioBloqueado, puedeEnviar, puedeAdjuntarFoto,
    resultadoDesconocido, reporteCreado, mensajeComprobacion, confirmarReporteExistente, cargarCatalogos,
    handleDepartamentoChange, handleCategoriaChange, handleDescripcionChange,
    handleAdjuntarFoto, handleEliminarFoto, handleFotoCargada, handleFotoError, handleReintentarFoto,
    handleSubmitReporte, cerrarModalExito, cerrarSesion,
  };
}
