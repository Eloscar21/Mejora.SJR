/**
 * useReporteViewModel.ts
 * ViewModel para la pantalla de "Crear Reporte / Nuevo Reporte" (US-004).
 * 
 * Principios aplicados:
 * - MVVM: Desacopla la vista de la obtención de catálogos y gestión de datos de la incidencia.
 * - DIP: Consume la abstracción ICatalogoService inyectada desde el proveedor.
 * - SRP: Orquesta la consulta de catálogos de US-002, filtrado de categorías dependientes, validación visual y registro del reporte.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { Departamento, Categoria, PickerItem } from '../models/catalogo.types';
import { NuevaIncidenciaDTO } from '../models/incidencia.types';

export interface ReporteErrors {
  departamento?: string;
  categoria?: string;
  descripcion?: string;
  direccion?: string;
  general?: string;
}

export function useReporteViewModel() {
  const { catalogoService, session, cerrarSesion } = useAuth();

  // Estados de Catálogos (US-004)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoadingCatalogos, setIsLoadingCatalogos] = useState<boolean>(true);
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null);

  // Estados del Formulario de Incidencia
  const [selectedDepartamento, setSelectedDepartamento] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState<string>('');
  const [direccionReferencia, setDireccionReferencia] = useState<string>(
    'Av. Juárez Ote. #45, Col. Centro, San Juan del Río'
  );
  const [fotoEvidenciaUri, setFotoEvidenciaUri] = useState<string | null>(null);
  const [coordenadas] = useState({ lat: 20.3889, lng: -99.9961 }); // Centro SJR

  // Estados de Validación y Envío
  const [errors, setErrors] = useState<ReporteErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [folioCreado, setFolioCreado] = useState<string | null>(null);

  // Cargar Catálogos Municipales (Consumo del endpoint US-002 según US-004)
  const cargarCatalogos = useCallback(async () => {
    setIsLoadingCatalogos(true);
    setErrorCatalogos(null);
    try {
      const [deptosData, catsData] = await Promise.all([
        catalogoService.obtenerDepartamentos(),
        catalogoService.obtenerCategorias(),
      ]);
      setDepartamentos(deptosData);
      setCategorias(catsData);
    } catch (err: any) {
      setErrorCatalogos(err?.message || 'Error al cargar los catálogos municipales.');
    } finally {
      setIsLoadingCatalogos(false);
    }
  }, [catalogoService]);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  // Items para el Picker de Departamentos
  const departamentosItems = useMemo<PickerItem<number>[]>(() => {
    return departamentos.map((d) => ({
      label: d.nombre,
      value: d.idDepartamento,
    }));
  }, [departamentos]);

  // Items para el Picker de Categorías (Filtradas reactivamente según el departamento seleccionado)
  const categoriasItems = useMemo<PickerItem<number>[]>(() => {
    const list = selectedDepartamento
      ? categorias.filter((c) => c.idDepartamento === selectedDepartamento)
      : categorias;

    return list.map((c) => ({
      label: c.nombre,
      value: c.idCategoria,
      extraInfo: c.departamentoNombre,
    }));
  }, [categorias, selectedDepartamento]);

  // Manejador del cambio de departamento
  const handleDepartamentoChange = useCallback(
    (idDepto: number) => {
      setSelectedDepartamento(idDepto);
      // Si la categoría seleccionada no pertenece al nuevo departamento, resetearla
      if (selectedCategoria) {
        const cat = categorias.find((c) => c.idCategoria === selectedCategoria);
        if (cat && cat.idDepartamento !== idDepto) {
          setSelectedCategoria(null);
        }
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next.departamento;
        return next;
      });
    },
    [categorias, selectedCategoria]
  );

  // Manejador del cambio de categoría
  const handleCategoriaChange = useCallback(
    (idCat: number) => {
      setSelectedCategoria(idCat);
      // Auto-seleccionar el departamento padre correspondiente
      const cat = categorias.find((c) => c.idCategoria === idCat);
      if (cat && cat.idDepartamento !== selectedDepartamento) {
        setSelectedDepartamento(cat.idDepartamento);
      }
      setErrors((prev) => {
        const next = { ...prev };
        delete next.categoria;
        return next;
      });
    },
    [categorias, selectedDepartamento]
  );

  const handleDescripcionChange = useCallback((text: string) => {
    setDescripcion(text);
    if (errors.descripcion) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.descripcion;
        return next;
      });
    }
  }, [errors]);

  const handleDireccionChange = useCallback((text: string) => {
    setDireccionReferencia(text);
    if (errors.direccion) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.direccion;
        return next;
      });
    }
  }, [errors]);

  // Simular toma o carga de foto de evidencia
  const handleAdjuntarFoto = useCallback(() => {
    // Generar URI de evidencia simulada para San Juan del Río
    const mockUris = [
      'https://images.unsplash.com/photo-1541888946425-d0fbb186fb4b?w=600',
      'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600',
      'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600',
    ];
    const randomUri = mockUris[Math.floor(Math.random() * mockUris.length)];
    setFotoEvidenciaUri(randomUri);
  }, []);

  const handleEliminarFoto = useCallback(() => {
    setFotoEvidenciaUri(null);
  }, []);

  // Validación Visual (Rojo en error)
  const validarFormulario = (): boolean => {
    const newErrors: ReporteErrors = {};

    if (!selectedDepartamento) {
      newErrors.departamento = 'Debes seleccionar el departamento correspondiente.';
    }

    if (!selectedCategoria) {
      newErrors.categoria = 'Debes seleccionar la categoría de la incidencia.';
    }

    if (!descripcion.trim()) {
      newErrors.descripcion = 'Por favor describe la problemática observada.';
    } else if (descripcion.trim().length < 10) {
      newErrors.descripcion = 'La descripción debe tener al menos 10 caracteres.';
    }

    if (!direccionReferencia.trim()) {
      newErrors.direccion = 'La dirección o referencia del reporte es obligatoria.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar Reporte de Incidencia
  const handleSubmitReporte = useCallback(async () => {
    if (!validarFormulario()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await new Promise((r) => setTimeout(r, 700)); // Latencia de procesamiento

      const randomFolio = `SJR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setFolioCreado(randomFolio);

      // Limpiar formulario tras éxito
      setSelectedDepartamento(null);
      setSelectedCategoria(null);
      setDescripcion('');
      setFotoEvidenciaUri(null);
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Error al enviar el reporte. Por favor intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDepartamento, selectedCategoria, descripcion, direccionReferencia]);

  const cerrarModalExito = useCallback(() => {
    setFolioCreado(null);
  }, []);

  return {
    session,
    departamentos,
    categorias,
    departamentosItems,
    categoriasItems,
    isLoadingCatalogos,
    errorCatalogos,
    selectedDepartamento,
    selectedCategoria,
    descripcion,
    direccionReferencia,
    coordenadas,
    fotoEvidenciaUri,
    errors,
    isSubmitting,
    folioCreado,
    cargarCatalogos,
    handleDepartamentoChange,
    handleCategoriaChange,
    handleDescripcionChange,
    handleDireccionChange,
    handleAdjuntarFoto,
    handleEliminarFoto,
    handleSubmitReporte,
    cerrarModalExito,
    cerrarSesion,
  };
}
