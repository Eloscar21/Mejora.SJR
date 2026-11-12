'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function loadSource(relativePath, dependencies = {}) {
  const filename = path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), name);
      for (const ext of ['.ts', '.tsx']) {
        if (existsSync(base + ext)) {
          return loadSource(base + ext, dependencies);
        }
      }
    }
    return originalRequire(name);
  };
  loaded._compile(outputText, filename);
  return loaded.exports;
}

function createHookRunner(hookPath, hookExportName, getArgs) {
  const cells = [];
  let cursor = 0;
  let effects = [];
  const same = (a, b) =>
    a && b && a.length === b.length && a.every((v, idx) => Object.is(v, b[idx]));

  function cell(kind, initialize) {
    const index = cursor++;
    if (!cells[index]) cells[index] = { kind, ...initialize() };
    assert.equal(cells[index].kind, kind);
    return cells[index];
  }

  const hooks = {
    useState(initial) {
      const state = cell('state', () => ({
        value: typeof initial === 'function' ? initial() : initial,
      }));
      return [
        state.value,
        (next) => {
          state.value = typeof next === 'function' ? next(state.value) : next;
        },
      ];
    },
    useRef(initial) {
      return cell('ref', () => ({ current: initial }));
    },
    useMemo(factory, dependencies) {
      const state = cell('memo', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.value = factory();
        state.dependencies = [...dependencies];
      }
      return state.value;
    },
    useCallback(callback, dependencies) {
      return hooks.useMemo(() => callback, dependencies);
    },
    useEffect(effect, dependencies) {
      const state = cell('effect', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.dependencies = [...dependencies];
        effects.push(() => {
          state.cleanup?.();
          state.cleanup = effect();
        });
      }
    },
  };

  const exported = loadSource(hookPath, { react: hooks });
  const hookFn = exported[hookExportName];

  function render() {
    cursor = 0;
    return hookFn(...getArgs());
  }

  function commit() {
    render();
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return render();
  }

  return {
    commit,
    async settle() {
      for (let i = 0; i < 8; i++) await Promise.resolve();
      return commit();
    },
  };
}

function sessionFor(idRol, idDepartamento = idRol === 3 ? 1 : null) {
  const payload = {
    idUsuario: idRol === 4 ? 4 : 3,
    idRol,
    idDepartamento,
    exp: Date.now() / 1000 + 3600,
  };
  return {
    obtenerToken: () => `token-rol-${idRol}`,
    decodificarToken: () => payload,
  };
}

const { MockIncidenciaService } = loadSource('src/services/mocks/MockIncidenciaService.ts');
const { MockCatalogoService } = loadSource('src/services/mocks/MockCatalogoService.ts');

test('US-026: Superadmin (Rol 4) filtra incidencias por secretaría, asigna trabajador y descarta falsos con modal', async () => {
  const session = sessionFor(4, null);
  const service = new MockIncidenciaService();
  const runner = createHookRunner(
    'src/viewModels/useIncidenciasViewModel.ts',
    'useIncidenciasViewModel',
    () => [session, service]
  );

  runner.commit();
  let vm = await runner.settle();

  assert.equal(vm.puedeAcceder, true);
  assert.equal(vm.puedeCambiarSecretaria, true);
  assert.equal(vm.incidencias.length, 5);
  assert.equal(vm.metricas.total, 5);

  // Filtrar por Secretaría 1 (JAPAM)
  vm.setFiltroSecretaria(1);
  vm = runner.commit();
  assert.equal(vm.incidencias.every((i) => i.idDepartamento === 1), true);
  assert.equal(vm.metricas.total, 2);

  // Restablecer filtro y asignar trabajador (ID 2 - JAPAM) a la incidencia #101
  vm.limpiarFiltros();
  vm = runner.commit();
  vm.seleccionarTrabajadorFila(101, 2);
  vm = runner.commit();
  await vm.asignarTrabajador(101);
  vm = await runner.settle();

  const incAsignada = vm.incidencias.find((i) => i.idIncidencia === 101);
  assert.equal(incAsignada.idTrabajadorAsignado, 2);
  assert.equal(incAsignada.idEstado, 2);
  assert.equal(vm.feedback.tipo, 'success');

  // Abrir modal para descartar reporte falso en incidencia #103
  const inc103 = vm.incidencias.find((i) => i.idIncidencia === 103);
  vm.abrirModalDescartar(inc103);
  vm = runner.commit();
  assert.equal(vm.incidenciaADescartar.idIncidencia, 103);

  // Intentar descartar con motivo menor a 5 caracteres rechaza la acción
  vm.setMotivoDescarte('abc');
  vm = runner.commit();
  await vm.confirmarDescarteFalso();
  vm = await runner.settle();
  assert.match(vm.errorMotivoDescarte, /5 caracteres/);

  // Confirmar descarte con motivo válido
  vm.setMotivoDescarte('Reporte falso verificado en campo por supervisor');
  vm = runner.commit();
  await vm.confirmarDescarteFalso();
  vm = await runner.settle();

  assert.equal(vm.incidenciaADescartar, null);
  const incDescartada = vm.incidencias.find((i) => i.idIncidencia === 103);
  assert.equal(incDescartada.idEstado, 5);
  assert.equal(vm.metricas.descartados, 2);
});

test('US-026: Admin de Departamento (Rol 3) queda acotado a su propia secretaría', async () => {
  const session = sessionFor(3, 2); // Depto 2: Servicios Públicos
  const service = new MockIncidenciaService();
  const runner = createHookRunner(
    'src/viewModels/useIncidenciasViewModel.ts',
    'useIncidenciasViewModel',
    () => [session, service]
  );

  runner.commit();
  const vm = await runner.settle();

  assert.equal(vm.puedeAcceder, true);
  assert.equal(vm.puedeCambiarSecretaria, false);
  assert.equal(vm.filtroSecretaria, 2);
  assert.equal(vm.incidencias.every((i) => i.idDepartamento === 2), true);
});

test('US-027: Administración de Catálogos visualiza y gestiona dependencias y categorías', async () => {
  const session = sessionFor(4, null);
  const service = new MockCatalogoService();
  const runner = createHookRunner(
    'src/viewModels/useCatalogosViewModel.ts',
    'useCatalogosViewModel',
    () => [session, service]
  );

  runner.commit();
  let vm = await runner.settle();

  assert.equal(vm.puedeConsultar, true);
  assert.equal(vm.puedeGestionarDepartamentos, true);
  assert.equal(vm.departamentos.length, 2);
  assert.equal(vm.categorias.length, 4);

  // Filtrar categorías por JAPAM (idDepartamento = 1)
  vm.setFiltroDepartamento(1);
  vm = runner.commit();
  assert.equal(vm.categorias.length, 2);
  assert.equal(vm.metricas.totalCategorias, 2);

  // Limpiar filtros y crear una nueva categoría
  vm.limpiarFiltros();
  vm.abrirCrearCategoria(2);
  vm = runner.commit();
  await vm.guardarCategoria({
    nombre: 'Recolección de poda',
    idDepartamento: 2,
    descripcion: 'Retiro de ramas en vía pública',
    prioridad: 'Baja',
    slaHoras: 72,
    activo: true,
  });
  vm = await runner.settle();

  assert.equal(vm.categorias.length, 5);
  assert.equal(vm.feedback.tipo, 'success');
});

const { IncidenciasDataGrid } = loadSource('src/views/incidencias/IncidenciasDataGrid.tsx', {
  '../errors/IntercepcionErrorView': {
    IntercepcionErrorView: ({ codigo }) => React.createElement('p', null, `Error ${codigo}`),
  },
});

const { CatalogosMunicipalesView } = loadSource(
  'src/views/catalogos/CatalogosMunicipalesView.tsx',
  {
    '../errors/IntercepcionErrorView': {
      IntercepcionErrorView: ({ codigo }) => React.createElement('p', null, `Error ${codigo}`),
    },
  }
);

test('SSR de vistas US-026 y US-027 renderiza filtros por secretaría, selector de asignación y catálogos', async () => {
  const session = sessionFor(4, null);
  const incRunner = createHookRunner(
    'src/viewModels/useIncidenciasViewModel.ts',
    'useIncidenciasViewModel',
    () => [session, new MockIncidenciaService()]
  );
  incRunner.commit();
  const incVm = await incRunner.settle();
  const htmlInc = renderToStaticMarkup(
    React.createElement(IncidenciasDataGrid, { viewModel: incVm })
  );

  assert.match(htmlInc, /Bandeja de Incidencias Ciudadanas/);
  assert.match(htmlInc, /Todas las secretarías/);
  assert.match(htmlInc, /Descartar Falso/);
  assert.match(htmlInc, /Seleccionar trabajador/);

  const catRunner = createHookRunner(
    'src/viewModels/useCatalogosViewModel.ts',
    'useCatalogosViewModel',
    () => [session, new MockCatalogoService()]
  );
  catRunner.commit();
  const catVm = await catRunner.settle();
  const htmlCat = renderToStaticMarkup(
    React.createElement(CatalogosMunicipalesView, { viewModel: catVm })
  );

  assert.match(htmlCat, /Administración de Catálogos Municipales/);
  assert.match(htmlCat, /JAPAM/);
  assert.match(htmlCat, /Servicios Públicos/);
  assert.match(htmlCat, /Fugas de agua/);
  assert.match(htmlCat, /Bacheo/);
});
