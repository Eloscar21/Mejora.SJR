'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CategoriaReporte,
  Departamento,
  GuardarCategoriaPayload,
  GuardarDepartamentoPayload,
  MetricasCatalogos,
} from '../models/catalogo.types';
import type { IAuthService } from '../services/contracts/IAuthService';
import type { ICatalogoService } from '../services/contracts/ICatalogoService';

export interface CatalogoFeedback {
  tipo: 'success' | 'error';
  texto: string;
}

export type ModalCatalogoEstado =
  | { tipo: 'crear_departamento' }
  | { tipo: 'editar_departamento'; departamento: Departamento }
  | { tipo: 'crear_categoria'; idDepartamentoPreseleccionado?: number }
  | { tipo: 'editar_categoria'; categoria: CategoriaReporte }
  | null;

/**
 * useCatalogosViewModel
 * ViewModel para la Administración de Catálogos Municipales (Dependencias y Categorías - US-027).
 *
 * Implementa el patrón MVVM:
 * - Consume ICatalogoService (DIP) y IAuthService para verificación de sesión y permisos.
 * - Permite visualizar y filtrar dependencias municipales (JAPAM, Servicios Públicos) y sus categorías.
 * - Orquesta la creación, edición y activación/desactivación de dependencias y categorías de reportes.
 */
export function useCatalogosViewModel(
  sesion: Pick<IAuthService, 'obtenerToken' | 'decodificarToken'>,
  catalogoService: ICatalogoService
) {
  const [inicializando, setInicializando] = useState(true);
  const [idRolActor, setIdRolActor] = useState<number | null>(null);
  const [idDepartamentoActor, setIdDepartamentoActor] = useState<number | null>(null);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [categorias, setCategorias] = useState<CategoriaReporte[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Filtros de la vista de catálogos
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState<number | 'todos'>('todos');
  const [filtroEstadoCategoria, setFiltroEstadoCategoria] = useState<'todos' | 'activas' | 'inactivas'>('todos');

  // Estado del modal de creación/edición
  const [modalActivo, setModalActivo] = useState<ModalCatalogoEstado>(null);
  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<CatalogoFeedback | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    setErrorCarga(null);

    const cargarCatalogos = async () => {
      try {
        const token = sesion.obtenerToken();
        const payload = token ? sesion.decodificarToken(token) : null;

        if (
          !payload ||
          typeof payload.exp !== 'number' ||
          !Number.isFinite(payload.exp) ||
          payload.exp <= Date.now() / 1000
        ) {
          setIdRolActor(null);
          setErrorAcceso('Tu sesión ha expirado o no es válida. Inicia sesión nuevamente.');
          return;
        }

        if (payload.idRol !== 3 && payload.idRol !== 4) {
          setIdRolActor(payload.idRol);
          setErrorAcceso('La administración de catálogos está reservada para Administradores y Superadmin.');
          return;
        }

        setIdRolActor(payload.idRol);
        setIdDepartamentoActor(
          payload.idDepartamento !== undefined && payload.idDepartamento !== null
            ? Number(payload.idDepartamento)
            : null
        );
        setErrorAcceso(null);

        const [listaDeptos, listaCategorias] = await Promise.all([
          catalogoService.obtenerDepartamentos(),
          catalogoService.obtenerCategorias(),
        ]);

        if (!cancelado) {
          setDepartamentos(listaDeptos);
          setCategorias(listaCategorias);
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setErrorCarga(
            err instanceof Error ? err.message : 'Error al cargar los catálogos municipales.'
          );
        }
      } finally {
        if (!cancelado) {
          setInicializando(false);
          setIsLoading(false);
        }
      }
    };

    void cargarCatalogos();

    return () => {
      cancelado = true;
    };
  }, [sesion, catalogoService, version]);

  const puedeConsultar = (idRolActor === 3 || idRolActor === 4) && !errorAcceso;
  const puedeGestionarDepartamentos = idRolActor === 4 && !errorAcceso;
  const puedeGestionarCategoria = useCallback(
    (idDepartamento?: number) => {
      if (!puedeConsultar) return false;
      if (idRolActor === 4) return true;
      if (idRolActor === 3 && idDepartamentoActor) {
        return idDepartamento === undefined || Number(idDepartamento) === idDepartamentoActor;
      }
      return false;
    },
    [puedeConsultar, idRolActor, idDepartamentoActor]
  );

  // Categorías filtradas reactivamente
  const categoriasFiltradas = useMemo(() => {
    return categorias.filter((cat) => {
      if (
        filtroDepartamento !== 'todos' &&
        Number(cat.idDepartamento) !== Number(filtroDepartamento)
      ) {
        return false;
      }

      const estaActiva = cat.activo !== false;
      if (filtroEstadoCategoria === 'activas' && !estaActiva) return false;
      if (filtroEstadoCategoria === 'inactivas' && estaActiva) return false;

      if (filtroTexto.trim()) {
        const q = filtroTexto.toLowerCase().trim();
        const coincide =
          cat.nombre.toLowerCase().includes(q) ||
          cat.departamentoNombre.toLowerCase().includes(q) ||
          (cat.descripcion || '').toLowerCase().includes(q) ||
          String(cat.idCategoria).includes(q);
        if (!coincide) return false;
      }

      return true;
    });
  }, [categorias, filtroDepartamento, filtroEstadoCategoria, filtroTexto]);

  // Métricas reactivas de cabecera
  const metricas: MetricasCatalogos = useMemo(() => {
    const totalDepartamentos = departamentos.length;
    const totalCategorias = categoriasFiltradas.length;
    const categoriasActivas = categoriasFiltradas.filter((c) => c.activo !== false).length;
    const categoriasJapam = categoriasFiltradas.filter((c) => Number(c.idDepartamento) === 1).length;
    const categoriasServiciosPublicos = categoriasFiltradas.filter(
      (c) => Number(c.idDepartamento) === 2
    ).length;

    return {
      totalDepartamentos,
      totalCategorias,
      categoriasActivas,
      categoriasJapam,
      categoriasServiciosPublicos,
    };
  }, [departamentos, categoriasFiltradas]);

  const contarCategoriasPorDepto = useCallback(
    (idDepartamento: number): number => {
      return categorias.filter((c) => Number(c.idDepartamento) === Number(idDepartamento)).length;
    },
    [categorias]
  );

  // Apertura y cierre de modales
  const abrirCrearDepartamento = useCallback(() => {
    if (!puedeGestionarDepartamentos) return;
    setErrorFormulario(null);
    setModalActivo({ tipo: 'crear_departamento' });
  }, [puedeGestionarDepartamentos]);

  const abrirEditarDepartamento = useCallback(
    (departamento: Departamento) => {
      if (!puedeGestionarDepartamentos) return;
      setErrorFormulario(null);
      setModalActivo({ tipo: 'editar_departamento', departamento: { ...departamento } });
    },
    [puedeGestionarDepartamentos]
  );

  const abrirCrearCategoria = useCallback(
    (idDepartamentoPreseleccionado?: number) => {
      if (!puedeGestionarCategoria(idDepartamentoPreseleccionado)) return;
      setErrorFormulario(null);
      setModalActivo({
        tipo: 'crear_categoria',
        idDepartamentoPreseleccionado:
          idRolActor === 3 && idDepartamentoActor
            ? idDepartamentoActor
            : idDepartamentoPreseleccionado,
      });
    },
    [puedeGestionarCategoria, idRolActor, idDepartamentoActor]
  );

  const abrirEditarCategoria = useCallback(
    (categoria: CategoriaReporte) => {
      if (!puedeGestionarCategoria(categoria.idDepartamento)) return;
      setErrorFormulario(null);
      setModalActivo({ tipo: 'editar_categoria', categoria: { ...categoria } });
    },
    [puedeGestionarCategoria]
  );

  const cerrarModal = useCallback(() => {
    if (guardando) return;
    setModalActivo(null);
    setErrorFormulario(null);
  }, [guardando]);

  // Operaciones de guardado
  const guardarDepartamento = useCallback(
    async (payload: GuardarDepartamentoPayload) => {
      if (!puedeGestionarDepartamentos || !modalActivo) return;
      setGuardando(true);
      setErrorFormulario(null);

      try {
        if (modalActivo.tipo === 'crear_departamento') {
          const creado = await catalogoService.crearDepartamento(payload);
          setDepartamentos((prev) => [...prev, creado]);
          setFeedback({
            tipo: 'success',
            texto: `Dependencia "${creado.nombre}" agregada al catálogo municipal.`,
          });
        } else if (modalActivo.tipo === 'editar_departamento') {
          const actualizado = await catalogoService.actualizarDepartamento(
            modalActivo.departamento.idDepartamento,
            payload
          );
          setDepartamentos((prev) =>
            prev.map((d) =>
              d.idDepartamento === actualizado.idDepartamento ? actualizado : d
            )
          );
          setCategorias((prev) =>
            prev.map((c) =>
              c.idDepartamento === actualizado.idDepartamento
                ? { ...c, departamentoNombre: actualizado.nombre }
                : c
            )
          );
          setFeedback({
            tipo: 'success',
            texto: `Dependencia "${actualizado.nombre}" actualizada correctamente.`,
          });
        }
        setModalActivo(null);
      } catch (err: unknown) {
        setErrorFormulario(
          err instanceof Error ? err.message : 'No se pudo guardar la dependencia.'
        );
      } finally {
        setGuardando(false);
      }
    },
    [puedeGestionarDepartamentos, modalActivo, catalogoService]
  );

  const guardarCategoria = useCallback(
    async (payload: GuardarCategoriaPayload) => {
      if (!modalActivo) return;
      if (!puedeGestionarCategoria(payload.idDepartamento)) {
        setErrorFormulario('No tienes permisos para gestionar categorías de otra dependencia.');
        return;
      }

      setGuardando(true);
      setErrorFormulario(null);

      try {
        if (modalActivo.tipo === 'crear_categoria') {
          const creada = await catalogoService.crearCategoria(payload);
          setCategorias((prev) => [...prev, creada]);
          setFeedback({
            tipo: 'success',
            texto: `Categoría "${creada.nombre}" registrada en ${creada.departamentoNombre}.`,
          });
        } else if (modalActivo.tipo === 'editar_categoria') {
          const actualizada = await catalogoService.actualizarCategoria(
            modalActivo.categoria.idCategoria,
            payload
          );
          setCategorias((prev) =>
            prev.map((c) => (c.idCategoria === actualizada.idCategoria ? actualizada : c))
          );
          setFeedback({
            tipo: 'success',
            texto: `Categoría "${actualizada.nombre}" actualizada exitosamente.`,
          });
        }
        setModalActivo(null);
      } catch (err: unknown) {
        setErrorFormulario(
          err instanceof Error ? err.message : 'No se pudo guardar la categoría.'
        );
      } finally {
        setGuardando(false);
      }
    },
    [modalActivo, puedeGestionarCategoria, catalogoService]
  );

  const alternarEstadoCategoria = useCallback(
    async (categoria: CategoriaReporte) => {
      if (!puedeGestionarCategoria(categoria.idDepartamento)) return;
      const nuevoEstado = !(categoria.activo !== false);
      try {
        const actualizada = await catalogoService.cambiarEstadoCategoria(
          categoria.idCategoria,
          nuevoEstado
        );
        setCategorias((prev) =>
          prev.map((c) => (c.idCategoria === actualizada.idCategoria ? actualizada : c))
        );
        setFeedback({
          tipo: 'success',
          texto: `Categoría "${actualizada.nombre}" marcada como ${
            nuevoEstado ? 'Activa' : 'Inactiva'
          }.`,
        });
      } catch (err: unknown) {
        setFeedback({
          tipo: 'error',
          texto:
            err instanceof Error ? err.message : 'No se pudo cambiar el estado de la categoría.',
        });
      }
    },
    [puedeGestionarCategoria, catalogoService]
  );

  const limpiarFiltros = useCallback(() => {
    setFiltroTexto('');
    setFiltroDepartamento('todos');
    setFiltroEstadoCategoria('todos');
  }, []);

  const recargar = useCallback(() => {
    if (!puedeConsultar) return;
    setIsLoading(true);
    setVersion((v) => v + 1);
  }, [puedeConsultar]);

  const limpiarFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return {
    inicializando,
    idRolActor,
    idDepartamentoActor,
    puedeConsultar,
    puedeGestionarDepartamentos,
    puedeGestionarCategoria,
    errorAcceso,

    departamentos,
    categorias: categoriasFiltradas,
    totalCategoriasOriginal: categorias.length,
    isLoading,
    errorCarga,
    metricas,
    contarCategoriasPorDepto,

    filtroTexto,
    setFiltroTexto,
    filtroDepartamento,
    setFiltroDepartamento,
    filtroEstadoCategoria,
    setFiltroEstadoCategoria,
    limpiarFiltros,

    modalActivo,
    guardando,
    errorFormulario,
    abrirCrearDepartamento,
    abrirEditarDepartamento,
    abrirCrearCategoria,
    abrirEditarCategoria,
    cerrarModal,
    guardarDepartamento,
    guardarCategoria,
    alternarEstadoCategoria,

    feedback,
    limpiarFeedback,
    recargar,
  };
}

