'use client';

import React, { useEffect, useId, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  Filter,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { CategoriaReporte, Departamento } from '../../models/catalogo.types';
import type { useCatalogosViewModel } from '../../viewModels/useCatalogosViewModel';
import { IntercepcionErrorView } from '../errors/IntercepcionErrorView';

interface CatalogosMunicipalesViewProps {
  viewModel: ReturnType<typeof useCatalogosViewModel>;
}

/**
 * CatalogosMunicipalesView
 * Vista de Administración de Catálogos Municipales (Dependencias y Categorías - US-027).
 */
export const CatalogosMunicipalesView: React.FC<CatalogosMunicipalesViewProps> = ({
  viewModel: vm,
}) => {
  const searchInputId = useId();
  const deptoSelectId = useId();
  const estadoSelectId = useId();

  // Estado local de los formularios modales
  const [nombreDepto, setNombreDepto] = useState('');
  const [siglasDepto, setSiglasDepto] = useState('');
  const [descripcionDepto, setDescripcionDepto] = useState('');
  const [titularDepto, setTitularDepto] = useState('');

  const [nombreCat, setNombreCat] = useState('');
  const [idDeptoCat, setIdDeptoCat] = useState<number>(1);
  const [descripcionCat, setDescripcionCat] = useState('');
  const [prioridadCat, setPrioridadCat] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [slaHorasCat, setSlaHorasCat] = useState<number>(48);

  useEffect(() => {
    if (!vm.modalActivo) return;

    if (vm.modalActivo.tipo === 'crear_departamento') {
      setNombreDepto('');
      setSiglasDepto('');
      setDescripcionDepto('');
      setTitularDepto('');
    } else if (vm.modalActivo.tipo === 'editar_departamento') {
      const d = vm.modalActivo.departamento;
      setNombreDepto(d.nombre);
      setSiglasDepto(d.siglas || '');
      setDescripcionDepto(d.descripcion || '');
      setTitularDepto(d.titular || '');
    } else if (vm.modalActivo.tipo === 'crear_categoria') {
      setNombreCat('');
      setIdDeptoCat(
        vm.modalActivo.idDepartamentoPreseleccionado ||
          vm.idDepartamentoActor ||
          (vm.departamentos[0]?.idDepartamento ?? 1)
      );
      setDescripcionCat('');
      setPrioridadCat('Media');
      setSlaHorasCat(48);
    } else if (vm.modalActivo.tipo === 'editar_categoria') {
      const c = vm.modalActivo.categoria;
      setNombreCat(c.nombre);
      setIdDeptoCat(c.idDepartamento);
      setDescripcionCat(c.descripcion || '');
      setPrioridadCat(c.prioridad || 'Media');
      setSlaHorasCat(c.slaHoras || 48);
    }
  }, [vm.modalActivo, vm.idDepartamentoActor, vm.departamentos]);

  if (vm.inicializando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Cargando catálogos municipales...</p>
      </div>
    );
  }

  if (!vm.puedeConsultar) {
    return <IntercepcionErrorView codigo={403} modo="embebido" />;
  }

  const hayFiltrosActivos =
    Boolean(vm.filtroTexto.trim()) ||
    vm.filtroDepartamento !== 'todos' ||
    vm.filtroEstadoCategoria !== 'todos';

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vm.modalActivo) return;

    if (
      vm.modalActivo.tipo === 'crear_departamento' ||
      vm.modalActivo.tipo === 'editar_departamento'
    ) {
      void vm.guardarDepartamento({
        nombre: nombreDepto,
        siglas: siglasDepto,
        descripcion: descripcionDepto,
        titular: titularDepto,
        activo: true,
      });
    } else {
      void vm.guardarCategoria({
        nombre: nombreCat,
        idDepartamento: idDeptoCat,
        descripcion: descripcionCat,
        prioridad: prioridadCat,
        slaHoras: slaHorasCat,
        activo: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
            <Database className="h-3.5 w-3.5" />
            Catálogos Oficiales • US-027
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Administración de Catálogos Municipales
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualización y gestión de dependencias municipales (Secretarías) y categorías de reportes ciudadanos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={vm.recargar}
            disabled={vm.isLoading}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${vm.isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Actualizar</span>
          </button>

          {vm.puedeGestionarDepartamentos && (
            <button
              type="button"
              onClick={vm.abrirCrearDepartamento}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Building2 className="h-4 w-4" />
              <span>Nueva Dependencia</span>
            </button>
          )}

          {vm.puedeGestionarCategoria() && (
            <button
              type="button"
              onClick={() => vm.abrirCrearCategoria()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Nueva Categoría</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Banner de Feedback */}
      {vm.feedback && (
        <div
          role="status"
          className={`flex items-center justify-between p-4 rounded-xl border text-sm transition-all ${
            vm.feedback.tipo === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            {vm.feedback.tipo === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{vm.feedback.texto}</span>
          </div>
          <button
            type="button"
            onClick={vm.limpiarFeedback}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3. Tarjetas KPI Superiores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Dependencias Oficiales
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {vm.metricas.totalDepartamentos}
            </span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Categorías en Vista
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">
              {vm.metricas.totalCategorias}
            </span>
            <Layers className="h-4 w-4 text-emerald-500" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Categorías JAPAM (1)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-700">
              {vm.metricas.categoriasJapam}
            </span>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Servicios Públicos (2)
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-indigo-700">
              {vm.metricas.categoriasServiciosPublicos}
            </span>
            <Database className="h-4 w-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* 4. Sección de Dependencias / Secretarías Municipales */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>Dependencias y Secretarías Municipales</span>
          </h2>
          <span className="text-xs text-slate-400">
            Haz clic en una dependencia para filtrar sus categorías
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vm.departamentos.map((depto: Departamento) => {
            const seleccionado = vm.filtroDepartamento === depto.idDepartamento;
            const numCategorias = vm.contarCategoriasPorDepto(depto.idDepartamento);

            return (
              <div
                key={depto.idDepartamento}
                className={`p-5 rounded-2xl bg-white border transition-all shadow-sm flex flex-col justify-between gap-4 ${
                  seleccionado
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-[#0A3D62] text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                      #{depto.idDepartamento}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{depto.nombre}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Activa
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {depto.descripcion || 'Dependencia oficial de atención ciudadana.'}
                      </p>
                    </div>
                  </div>

                  {vm.puedeGestionarDepartamentos && (
                    <button
                      type="button"
                      onClick={() => vm.abrirEditarDepartamento(depto)}
                      aria-label={`Editar dependencia ${depto.nombre}`}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                      title="Editar dependencia"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    {numCategorias} {numCategorias === 1 ? 'categoría asociada' : 'categorías asociadas'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        vm.setFiltroDepartamento(
                          seleccionado ? 'todos' : depto.idDepartamento
                        )
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        seleccionado
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {seleccionado ? 'Mostrando categorías' : 'Filtrar categorías'}
                    </button>

                    {vm.puedeGestionarCategoria(depto.idDepartamento) && (
                      <button
                        type="button"
                        onClick={() => vm.abrirCrearCategoria(depto.idDepartamento)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Agregar Categoría</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Barra de Filtros de Categorías */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id={searchInputId}
            type="text"
            value={vm.filtroTexto}
            onChange={(e) => vm.setFiltroTexto(e.target.value)}
            placeholder="Buscar categoría por nombre, descripción o dependencia..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {vm.filtroTexto && (
            <button
              type="button"
              onClick={() => vm.setFiltroTexto('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              id={deptoSelectId}
              aria-label="Filtrar categorías por dependencia"
              value={String(vm.filtroDepartamento)}
              onChange={(e) => {
                const val = e.target.value;
                vm.setFiltroDepartamento(val === 'todos' ? 'todos' : Number(val));
              }}
              className="text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todas las dependencias</option>
              {vm.departamentos.map((d) => (
                <option key={d.idDepartamento} value={d.idDepartamento}>
                  Depto #{d.idDepartamento} - {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <select
            id={estadoSelectId}
            aria-label="Filtrar categorías por estado"
            value={vm.filtroEstadoCategoria}
            onChange={(e) =>
              vm.setFiltroEstadoCategoria(e.target.value as 'todos' | 'activas' | 'inactivas')
            }
            className="text-xs rounded-lg border border-slate-300 py-2 px-2.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="activas">Solo Activas</option>
            <option value="inactivas">Solo Inactivas</option>
          </select>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={vm.limpiarFiltros}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* 6. Tabla DataGrid de Categorías de Reportes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 w-20">ID</th>
                <th className="py-3.5 px-4">Categoría de Reporte</th>
                <th className="py-3.5 px-4">Dependencia Responsable</th>
                <th className="py-3.5 px-4">Prioridad / SLA</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {vm.categorias.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 space-y-2">
                    <Layers className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-medium">
                      No se encontraron categorías con los filtros aplicados.
                    </p>
                  </td>
                </tr>
              ) : (
                vm.categorias.map((cat: CategoriaReporte) => {
                  const estaActiva = cat.activo !== false;
                  const puedeEditar = vm.puedeGestionarCategoria(cat.idDepartamento);

                  return (
                    <tr
                      key={cat.idCategoria}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                        #CAT-{String(cat.idCategoria).padStart(2, '0')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{cat.nombre}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {cat.descripcion || 'Categoría oficial para levantamiento de reportes.'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Building2 className="h-3.5 w-3.5" />
                          {cat.departamentoNombre} (#{cat.idDepartamento})
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.prioridad === 'Alta'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {cat.prioridad || 'Media'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-slate-500 text-[11px]">
                            <Clock className="h-3 w-3" />
                            {cat.slaHoras || 48}h
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            estaActiva
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              estaActiva ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {estaActiva ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => vm.abrirEditarCategoria(cat)}
                            disabled={!puedeEditar}
                            aria-label={`Editar categoría ${cat.nombre}`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors disabled:opacity-40"
                            title="Editar categoría"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => vm.alternarEstadoCategoria(cat)}
                            disabled={!puedeEditar}
                            aria-label={`Cambiar estado de categoría ${cat.nombre}`}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors disabled:opacity-40"
                            title={estaActiva ? 'Desactivar categoría' : 'Reactivar categoría'}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Mostrando <strong>{vm.categorias.length}</strong> de{' '}
            <strong>{vm.totalCategoriasOriginal}</strong> categorías de reportes
          </span>
          <span className="text-[11px] text-slate-400">
            Sincronizado con API de Catálogos Oficiales (`/api/catalogos`)
          </span>
        </div>
      </div>

      {/* 7. Modal de Creación / Edición de Dependencia o Categoría */}
      {vm.modalActivo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#0A3D62] px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">
                  {vm.modalActivo.tipo === 'crear_departamento' && 'Nueva Dependencia Municipal'}
                  {vm.modalActivo.tipo === 'editar_departamento' && 'Editar Dependencia Municipal'}
                  {vm.modalActivo.tipo === 'crear_categoria' && 'Nueva Categoría de Reporte'}
                  {vm.modalActivo.tipo === 'editar_categoria' && 'Editar Categoría de Reporte'}
                </h2>
                <p className="text-xs text-blue-100">
                  Catálogo Oficial del Municipio de San Juan del Río
                </p>
              </div>
              <button
                type="button"
                onClick={vm.cerrarModal}
                className="text-blue-100 hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4 text-xs">
              {vm.modalActivo.tipo === 'crear_departamento' ||
              vm.modalActivo.tipo === 'editar_departamento' ? (
                <>
                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      Nombre de la Dependencia / Secretaría *
                    </label>
                    <input
                      type="text"
                      required
                      value={nombreDepto}
                      onChange={(e) => setNombreDepto(e.target.value)}
                      placeholder="Ej. Obras Públicas Municipales"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Siglas</label>
                      <input
                        type="text"
                        value={siglasDepto}
                        onChange={(e) => setSiglasDepto(e.target.value)}
                        placeholder="Ej. SOPM"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Área / Titular</label>
                      <input
                        type="text"
                        value={titularDepto}
                        onChange={(e) => setTitularDepto(e.target.value)}
                        placeholder="Ej. Dirección Operativa"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">Descripción</label>
                    <textarea
                      rows={3}
                      value={descripcionDepto}
                      onChange={(e) => setDescripcionDepto(e.target.value)}
                      placeholder="Competencias y alcance operativo de la secretaría..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      Nombre de la Categoría *
                    </label>
                    <input
                      type="text"
                      required
                      value={nombreCat}
                      onChange={(e) => setNombreCat(e.target.value)}
                      placeholder="Ej. Poda de árboles en vía pública"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      Dependencia Responsable *
                    </label>
                    <select
                      value={idDeptoCat}
                      disabled={vm.idRolActor === 3}
                      onChange={(e) => setIdDeptoCat(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      {vm.departamentos.map((d) => (
                        <option key={d.idDepartamento} value={d.idDepartamento}>
                          #{d.idDepartamento} - {d.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Prioridad</label>
                      <select
                        value={prioridadCat}
                        onChange={(e) =>
                          setPrioridadCat(e.target.value as 'Alta' | 'Media' | 'Baja')
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Alta">Alta</option>
                        <option value="Media">Media</option>
                        <option value="Baja">Baja</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">
                        SLA Estimado (Horas)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={720}
                        value={slaHorasCat}
                        onChange={(e) => setSlaHorasCat(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-semibold text-slate-700">
                      Descripción Operativa
                    </label>
                    <textarea
                      rows={2}
                      value={descripcionCat}
                      onChange={(e) => setDescripcionCat(e.target.value)}
                      placeholder="Criterios de atención para este tipo de incidencia..."
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {vm.errorFormulario && (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {vm.errorFormulario}
                </p>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={vm.cerrarModal}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={vm.guardando}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {vm.guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

