'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function loadSource(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true
    },
    fileName: filename
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : originalRequire(name);
  loaded._compile(outputText, filename);
  return loaded.exports;
}

// Ejecuta el hook real con hooks controlados. No reproduce un montaje React.
function createHarness(initialSession, initialQuery) {
  const cells = [];
  let cursor = 0;
  let effects = [];
  let session = initialSession;
  let query = initialQuery;
  const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  function cell(kind, initialize) {
    const index = cursor++;
    if (!cells[index]) cells[index] = { kind, ...initialize() };
    assert.equal(cells[index].kind, kind);
    return cells[index];
  }
  const hooks = {
    useState(initial) {
      const state = cell('state', () => ({ value: typeof initial === 'function' ? initial() : initial }));
      return [state.value, next => { state.value = typeof next === 'function' ? next(state.value) : next; }];
    },
    useRef(initial) { return cell('ref', () => ({ current: initial })); },
    useMemo(factory, dependencies) {
      const state = cell('memo', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.value = factory();
        state.dependencies = [...dependencies];
      }
      return state.value;
    },
    useCallback(callback, dependencies) { return hooks.useMemo(() => callback, dependencies); },
    useEffect(effect, dependencies) {
      const state = cell('effect', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.dependencies = [...dependencies];
        effects.push(() => { state.cleanup?.(); state.cleanup = effect(); });
      }
    }
  };
  const { usePersonalTableViewModel } = loadSource('src/viewModels/usePersonalTableViewModel.ts', { react: hooks });
  function render() { cursor = 0; return usePersonalTableViewModel(session, query); }
  function commit() {
    render();
    const pending = effects;
    effects = [];
    pending.forEach(effect => effect());
    return render();
  }
  return {
    commit,
    setSession(next) { session = next; },
    setQuery(next) { query = next; },
    async settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); return commit(); },
    unmount() { cells.forEach(state => { if (state.kind === 'effect') state.cleanup?.(); }); }
  };
}

let sessionNumber = 0;
function sessionFor(idRol, overrides = {}, token = `token-prueba-${++sessionNumber}`) {
  const payload = { idUsuario: idRol === 4 ? 4 : 6, idRol, idDepartamento: idRol === 3 ? 1 : null, exp: Date.now() / 1000 + 3600, ...overrides };
  return { obtenerToken: () => token, decodificarToken: () => payload };
}
function deferred() {
  let resolve;
  const promise = new Promise(ok => { resolve = ok; });
  return { promise, resolve };
}
const worker = { idUsuario: 2, nombre: 'Pedro', email: 'pedro@test.com', idRol: 2, idDepartamento: 1, activo: true };
const otherWorker = { ...worker, idUsuario: 5, nombre: 'Ana', email: 'ana@test.com' };
const admin = { ...worker, idUsuario: 3, nombre: 'Maria', idRol: 3, idDepartamento: 2 };

test('rol 3 consulta, filtra y recarga sin adquirir permiso de gestión', async () => {
  let calls = 0;
  const harness = createHarness(sessionFor(3), { async listarEmpleados() { calls++; return [worker, otherWorker]; } });
  harness.commit();
  let vm = await harness.settle();
  assert.equal(vm.puedeConsultar, true);
  assert.equal(vm.puedeGestionar, false);
  assert.deepEqual(vm.empleados, [worker, otherWorker]);
  vm.setFiltroTexto('pedro');
  vm = harness.commit();
  assert.deepEqual(vm.empleados, [worker]);
  assert.equal(vm.totalOriginal, 2);
  vm.recargar(); harness.commit();
  vm = await harness.settle();
  assert.equal(calls, 2);
  assert.equal(vm.filtroTexto, 'pedro');
  assert.deepEqual(vm.empleados, [worker]);
});

test('rol 3 no abre formularios ni procesa cambios aunque se invoquen sus handlers directamente', async () => {
  const harness = createHarness(sessionFor(3), { async listarEmpleados() { return [worker]; } });
  harness.commit();
  let vm = await harness.settle();
  vm.abrirCrear(); vm.abrirEditar(worker); vm.abrirDesactivar(worker);
  vm.procesarCambio({ tipo: 'creado', empleado: otherWorker });
  vm.procesarCambio({ tipo: 'actualizado', empleado: { ...worker, nombre: 'Cambio indebido' } });
  vm.procesarCambio({ tipo: 'desactivado', idUsuario: worker.idUsuario });
  vm = harness.commit();
  assert.equal(vm.accionModal, null);
  assert.equal(vm.feedback, null);
  assert.deepEqual(vm.empleados, [worker]);
});

test('rol 4 conserva creación, edición por copia y baja desde la tabla', async () => {
  const harness = createHarness(sessionFor(4), { async listarEmpleados() { return [worker, admin]; } });
  harness.commit();
  let vm = await harness.settle();
  assert.equal(vm.puedeConsultar, true);
  assert.equal(vm.puedeGestionar, true);
  vm.abrirCrear(); vm = harness.commit();
  assert.deepEqual(vm.accionModal, { tipo: 'crear' });
  vm.cerrarModal(); vm = harness.commit();
  vm.abrirEditar(worker); vm = harness.commit();
  assert.equal(vm.accionModal.tipo, 'editar');
  assert.notEqual(vm.accionModal.empleado, worker);
  assert.deepEqual(vm.accionModal.empleado, worker);
  vm.cerrarModal(); vm = harness.commit();
  vm.abrirDesactivar(worker); vm = harness.commit();
  assert.equal(vm.accionModal.tipo, 'desactivar');
  assert.notEqual(vm.accionModal.empleado, worker);
});

test('rol 4 procesa el empleado confirmado y vuelve a consultar sin repetir una escritura', async () => {
  let rows = [worker];
  let calls = 0;
  const harness = createHarness(sessionFor(4), { async listarEmpleados() { calls++; return rows; } });
  harness.commit();
  let vm = await harness.settle();
  rows = [otherWorker, worker];
  vm.procesarCambio({ tipo: 'creado', empleado: otherWorker });
  harness.commit(); vm = await harness.settle();
  assert.equal(calls, 2);
  assert.deepEqual(vm.empleados, rows);
  assert.equal(vm.feedback.tipo, 'success');
});

for (const rol of [1, 2, 99, '3']) {
  test(`el rol no admitido ${JSON.stringify(rol)} no consulta ni obtiene permisos`, async () => {
    let calls = 0;
    const harness = createHarness(sessionFor(rol), { async listarEmpleados() { calls++; return [worker]; } });
    harness.commit();
    const vm = await harness.settle();
    assert.equal(calls, 0);
    assert.equal(vm.puedeConsultar, false);
    assert.equal(vm.puedeGestionar, false);
  });
}

for (const [caso, session] of [
  ['sin token', sessionFor(3, {}, null)],
  ['token expirado', sessionFor(3, { exp: 1 })],
  ['sin expiración', sessionFor(3, { exp: undefined })],
  ['expiración no finita', sessionFor(3, { exp: Infinity })]
]) {
  test(`${caso}: no consulta empleados`, async () => {
    let calls = 0;
    const harness = createHarness(session, { async listarEmpleados() { calls++; return [worker]; } });
    harness.commit();
    const vm = await harness.settle();
    assert.equal(calls, 0);
    assert.equal(vm.puedeConsultar, false);
    assert.equal(vm.puedeGestionar, false);
  });
}

test('un fallo de consulta muestra error y permite al rol 3 reintentar con el mismo servicio', async () => {
  let calls = 0;
  const harness = createHarness(sessionFor(3), { async listarEmpleados() {
    if (++calls === 1) throw new Error('Servidor no disponible');
    return [worker];
  } });
  harness.commit();
  let vm = await harness.settle();
  assert.equal(vm.puedeConsultar, true);
  assert.equal(vm.puedeGestionar, false);
  assert.match(vm.errorListado, /no disponible/);
  assert.deepEqual(vm.empleados, []);
  vm.recargar(); harness.commit(); vm = await harness.settle();
  assert.equal(calls, 2);
  assert.equal(vm.errorListado, null);
  assert.deepEqual(vm.empleados, [worker]);
});

for (const status of [401, 403]) {
  test(`un rechazo HTTP ${status} retira los permisos de consulta y gestión`, async () => {
    const harness = createHarness(sessionFor(3), { async listarEmpleados() { throw Object.assign(new Error('Acceso rechazado'), { status }); } });
    harness.commit();
    const vm = await harness.settle();
    assert.equal(vm.puedeConsultar, false);
    assert.equal(vm.puedeGestionar, false);
    assert.ok(vm.errorAcceso);
  });
}

test('cambiar la sesión limpia el listado y el modal anteriores mientras se consulta el nuevo alcance', async () => {
  const second = deferred();
  let calls = 0;
  const harness = createHarness(sessionFor(4), { listarEmpleados() { return ++calls === 1 ? Promise.resolve([worker, admin]) : second.promise; } });
  harness.commit();
  let vm = await harness.settle();
  vm.abrirEditar(admin); harness.commit();
  harness.setSession(sessionFor(3));
  vm = harness.commit();
  assert.equal(vm.puedeConsultar, true);
  assert.equal(vm.puedeGestionar, false);
  assert.equal(vm.accionModal, null);
  assert.deepEqual(vm.empleados, []);
  second.resolve([worker]); vm = await harness.settle();
  assert.deepEqual(vm.empleados, [worker]);
});

test('una respuesta anterior no reemplaza el listado de una sesión nueva', async () => {
  const old = deferred();
  const harness = createHarness(sessionFor(4), { listarEmpleados() { return old.promise; } });
  harness.commit();
  harness.setSession(sessionFor(3));
  harness.setQuery({ async listarEmpleados() { return [worker]; } });
  harness.commit(); await harness.settle();
  old.resolve([admin]);
  const vm = await harness.settle();
  assert.deepEqual(vm.empleados, [worker]);
  assert.equal(vm.puedeGestionar, false);
});

// SSR usa React y la vista reales; solo se aíslan el compositor de formularios y la vista de error ajenos a esta HU.
const { PersonalDataGrid } = loadSource('src/views/personal/PersonalDataGrid.tsx', {
  '../../providers/PersonalFormularios': { PersonalFormularios: () => React.createElement('div', { 'data-formularios': 'montados' }) },
  '../errors/IntercepcionErrorView': { IntercepcionErrorView: ({ codigo }) => React.createElement('p', null, `Acceso denegado ${codigo}`) }
});
const renderView = vm => renderToStaticMarkup(React.createElement(PersonalDataGrid, { viewModel: vm, servicios: {} }));

test('la vista de rol 3 muestra sus datos y filtros sin crear, editar, desactivar ni montar formularios', async () => {
  const harness = createHarness(sessionFor(3), { async listarEmpleados() { return [worker]; } });
  harness.commit();
  const html = renderView(await harness.settle());
  assert.match(html, /Pedro/);
  assert.match(html, /Buscar por nombre/);
  assert.match(html, /Actualizar/);
  assert.doesNotMatch(html, /Nuevo Empleado|Editar empleado|Desactivar empleado|>Acciones<|data-formularios/);
  const body = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)[1];
  assert.equal((body.match(/<td\b/g) || []).length, 5);
});

test('la vista de rol 4 conserva las acciones y la composición de formularios', async () => {
  const harness = createHarness(sessionFor(4), { async listarEmpleados() { return [worker]; } });
  harness.commit();
  const html = renderView(await harness.settle());
  assert.match(html, /Nuevo Empleado/);
  assert.match(html, /Editar empleado Pedro/);
  assert.match(html, /Desactivar empleado Pedro/);
  assert.match(html, />Acciones</);
  assert.match(html, /data-formularios="montados"/);
});

test('la vista rechaza la consulta no autorizada sin presentar datos ni acciones', async () => {
  const harness = createHarness(sessionFor(2), { async listarEmpleados() { return [worker]; } });
  harness.commit();
  const html = renderView(await harness.settle());
  assert.match(html, /Acceso denegado 403/);
  assert.doesNotMatch(html, /Pedro|Nuevo Empleado|data-formularios/);
});

test('carga y vacío de solo consulta mantienen cinco columnas', async () => {
  const pending = deferred();
  let calls = 0;
  const harness = createHarness(sessionFor(3), { listarEmpleados() { return ++calls === 1 ? Promise.resolve([]) : pending.promise; } });
  harness.commit();
  const vm = await harness.settle();
  const empty = renderView(vm);
  assert.match(empty, /colspan="5"/i);
  assert.doesNotMatch(empty, />Acciones</);
  vm.recargar();
  const loading = renderView(harness.commit());
  const body = loading.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)[1];
  assert.equal((body.match(/<td\b/g) || []).length, 20);
  pending.resolve([]);
  assert.match(renderView(await harness.settle()), /colspan="5"/i);
});
