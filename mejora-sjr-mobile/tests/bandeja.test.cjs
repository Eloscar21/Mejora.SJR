const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, Error, Promise,
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Dependencia inesperada: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

const { MockBandejaConsultaService } = loadSource('../src/services/mocks/MockBandejaConsultaService.ts');
const worker = (idUsuario = 2, idRol = 2) => ({ idUsuario, idRol, idDepartamento: 1, nombre: 'Trabajador de prueba' });
const ids = (items) => Array.from(items, (item) => item.idIncidencia);
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

// El hook real se ejecuta con estado/efectos controlados. No es un montaje de React ni de Expo.
function createHarness(consulta, initialSession = worker(), close = async () => {}) {
  const cells = [];
  let cursor = 0, session = initialSession, writes = 0;
  let effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  function cell(kind, initialize) {
    const index = cursor++;
    if (!cells[index]) cells[index] = { kind, ...initialize() };
    assert.equal(cells[index].kind, kind);
    return cells[index];
  }
  const react = {
    useState(initial) {
      const state = cell('state', () => ({ value: typeof initial === 'function' ? initial() : initial }));
      return [state.value, (next) => { writes++; state.value = typeof next === 'function' ? next(state.value) : next; }];
    },
    useMemo(factory, dependencies) {
      const state = cell('memo', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.value = factory(); state.dependencies = [...dependencies];
      }
      return state.value;
    },
    useCallback(callback, dependencies) { return react.useMemo(() => callback, dependencies); },
    useEffect(effect, dependencies) {
      const state = cell('effect', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.dependencies = [...dependencies];
        effects.push(() => { state.cleanup?.(); state.cleanup = effect(); });
      }
    },
  };
  const { useBandejaViewModel } = loadSource('../src/viewModels/useBandejaViewModel.ts', {
    react,
    '../providers/AuthProvider': { useAuth: () => ({ session, cerrarSesion: close }) },
  });
  function render() { cursor = 0; return useBandejaViewModel(consulta); }
  function commit() {
    render();
    const pending = effects; effects = []; pending.forEach((effect) => effect());
    return render();
  }
  return {
    render, commit,
    setSession(next) { session = next; },
    async settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); return commit(); },
    unmount() { cells.forEach((state) => { if (state.kind === 'effect') state.cleanup?.(); }); },
    get writes() { return writes; },
  };
}

test('el mock conserva asignaciones fijas y excluye otras del mismo departamento o sin asignar', async () => {
  const service = new MockBandejaConsultaService();
  const own = await service.listarAsignadas(2);
  assert.deepEqual(ids(own), [101, 102, 104, 105, 106]);
  assert.ok(own.every((item) => item.idTrabajadorAsignado === 2));
  assert.deepEqual(ids(await service.listarAsignadas(8)), [107]);
  assert.deepEqual(ids(await service.listarAsignadas(99)), []);
  own[0].descripcion = 'Cambio local de prueba';
  assert.notEqual((await service.listarAsignadas(2))[0].descripcion, own[0].descripcion);
});

for (const id of [0, -1, 1.5, NaN, Infinity, '2']) {
  test(`el mock rechaza un identificador no válido: ${String(id)}`, async () => {
    await assert.rejects(new MockBandejaConsultaService().listarAsignadas(id), /identificador/);
  });
}

test('el hook calcula filtros y conteos solo sobre las tareas propias', async () => {
  const harness = createHarness(new MockBandejaConsultaService());
  assert.equal(harness.commit().listStatus, 'loading');
  let result = await harness.settle();
  assert.equal(result.listStatus, 'ready');
  assert.equal(result.totalAsignadas, 5);
  assert.equal(result.pendientes, 2);
  assert.equal(result.enCurso, 1);
  assert.deepEqual(Array.from(result.filtros, (filter) => filter.count), [5, 1, 1, 1, 1, 1]);
  result.cambiarFiltro(3);
  result = harness.commit();
  assert.deepEqual(ids(result.tareas), [101]);
  assert.equal(result.totalAsignadas, 5);
  assert.equal(result.filtros.find((filter) => filter.value === 3).selected, true);
  result.cambiarFiltro(99);
  assert.equal(harness.commit().filtroEstado, 3);
  assert.equal(result.handleCambiarEstado, undefined);
});

for (const session of [null, worker(2, 1), worker(0), worker(-1), worker('2')]) {
  test(`un perfil inválido no consulta ni utiliza ID de respaldo: ${JSON.stringify(session)}`, () => {
    let calls = 0;
    const harness = createHarness({ async listarAsignadas() { calls++; return []; } }, session);
    const result = harness.commit();
    assert.equal(calls, 0);
    assert.equal(result.listStatus, 'error');
    assert.equal(result.totalAsignadas, 0);
    assert.equal(result.puedeRecargar, false);
    assert.deepEqual(ids(result.tareas), []);
  });
}

test('el VM también excluye tareas ajenas si la implementación de consulta las entrega', async () => {
  const mock = new MockBandejaConsultaService();
  const own = await mock.listarAsignadas(2);
  const other = await mock.listarAsignadas(8);
  const harness = createHarness({ async listarAsignadas() { return [...own, ...other, { ...own[0], idIncidencia: 999, idTrabajadorAsignado: null }]; } });
  harness.commit();
  const result = await harness.settle();
  assert.deepEqual(ids(result.tareas), [101, 102, 104, 105, 106]);
  assert.equal(result.totalAsignadas, 5);
});

test('un error se distingue de vacío y reintentar permite recuperar la consulta', async () => {
  const attempts = [];
  const harness = createHarness({ listarAsignadas(id) { const request = deferred(); attempts.push({ ...request, id }); return request.promise; } });
  harness.commit();
  assert.equal(attempts[0].id, 2);
  attempts[0].reject(new Error('Consulta de ejemplo no disponible'));
  let result = await harness.settle();
  assert.equal(result.listStatus, 'error');
  assert.match(result.error, /no disponible/);
  assert.equal(result.puedeRecargar, true);
  result.recargar(); harness.commit();
  assert.equal(attempts.length, 2);
  attempts[1].resolve([]);
  result = await harness.settle();
  assert.equal(result.listStatus, 'empty');
  assert.equal(result.error, null);
  assert.equal(result.emptyTitle, 'No tienes tareas asignadas');
});

test('una lista sin resultados de filtro tiene un mensaje distinto a no tener asignaciones', async () => {
  const mock = new MockBandejaConsultaService();
  const service = { async listarAsignadas() { return (await mock.listarAsignadas(2)).filter((item) => item.idEstado === 1); } };
  const harness = createHarness(service); harness.commit();
  let result = await harness.settle();
  result.cambiarFiltro(4); result = harness.commit();
  assert.equal(result.totalAsignadas, 1);
  assert.equal(result.listStatus, 'empty');
  assert.equal(result.emptyTitle, 'No hay tareas con este filtro');
});

test('una respuesta anterior no sobrescribe las tareas de otra identidad', async () => {
  const requests = [];
  const mock = new MockBandejaConsultaService();
  const harness = createHarness({ listarAsignadas(id) { const request = deferred(); requests.push({ ...request, id }); return request.promise; } });
  harness.commit();
  harness.setSession(worker(8));
  assert.deepEqual(ids(harness.render().tareas), []);
  harness.commit();
  requests[1].resolve(await mock.listarAsignadas(8));
  assert.deepEqual(ids((await harness.settle()).tareas), [107]);
  requests[0].resolve(await mock.listarAsignadas(2));
  assert.deepEqual(ids((await harness.settle()).tareas), [107]);
});

test('desmontar impide publicar una consulta tardía', async () => {
  const request = deferred();
  const harness = createHarness({ listarAsignadas() { return request.promise; } });
  harness.commit(); harness.unmount();
  const writes = harness.writes;
  request.resolve([]);
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assert.equal(harness.writes, writes);
});
