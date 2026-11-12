'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadSource(relativePath, dependencies = {}, cache = new Map()) {
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
    }).outputText;
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, loaded);
    const ordinary = loaded.require.bind(loaded);
    loaded.require = name => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), name);
        const target = [base, `${base}.ts`, `${base}.tsx`].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (target && /\.tsx?$/.test(target)) return load(target);
      }
      return ordinary(name);
    };
    loaded._compile(source, filename);
    return loaded.exports;
  }
  return load(path.resolve(__dirname, relativePath));
}

const { ReporteConsultaApiService } = loadSource('../src/services/api/ReporteConsultaApiService.ts', {
  './apiConfig': { getApiBaseUrl: () => 'http://servidor-prueba.local/api' },
});
const { ReporteApiError } = loadSource('../src/services/api/ReporteApiError.ts');
const ciudadano = { idUsuario: 1, idRol: 1, nombre: 'Ciudadano', email: 'ciudadano@test.com', idDepartamento: null };
const categorias = [{ idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2 }];
const fecha = '2026-11-11T12:00:00.000Z';
const borrador = { descripcion: 'Bache frente al parque municipal', idCategoria: 4, latitud: 20.3889, longitud: -99.9961 };
function reporte(overrides = {}) {
  return { idIncidencia: 42, idUsuario: 1, ...borrador, idEstado: 1, fechaCreacion: fecha, fotoInicialUrl: null, ...overrides };
}
const response = (data, status = 200, success = true) => new Response(JSON.stringify({ success, data }), { status });
const plain = value => JSON.parse(JSON.stringify(value));
const ids = filas => Array.from(filas, fila => fila.reporte.idIncidencia);
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test('GET privado utiliza JWT y ruta fija, sin identidad en query ni body', async () => {
  const calls = [];
  const service = new ReporteConsultaApiService({ async obtenerToken() { return 'token-ciudadano'; } }, 'http://localhost:5000/api///', async (url, options) => {
    calls.push({ url, options });
    return response([{ ...reporte(), passwordHash: 'campo-ajeno' }]);
  });
  const result = await service.listarMisReportes({ idUsuario: 99 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:5000/api/incidencias/mis-reportes');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-ciudadano');
  assert.equal(calls[0].options.body, undefined);
  assert.equal(result[0].idUsuario, 1);
  assert.equal(result[0].passwordHash, undefined);
});

test('normaliza idCiudadano y acepta un reporte sin fotografía ni nombres enriquecidos', async () => {
  const { idUsuario, fotoInicialUrl, ...base } = reporte();
  const service = new ReporteConsultaApiService({ async obtenerToken() { return 'token'; } }, undefined, async url => {
    assert.equal(url, 'http://servidor-prueba.local/api/incidencias/mis-reportes');
    return response([{ ...base, idCiudadano: idUsuario }]);
  });
  const result = await service.listarMisReportes();
  assert.deepEqual(plain(result), [reporte()]);
});

test('consulta la credencial actual cada vez y acepta una lista vacía real', async () => {
  let token = 'primero';
  const tokens = [];
  const service = new ReporteConsultaApiService({ async obtenerToken() { return token; } }, undefined, async (_url, options) => {
    tokens.push(options.headers.Authorization); return response([]);
  });
  assert.deepEqual(await service.listarMisReportes(), []);
  token = 'segundo'; await service.listarMisReportes();
  assert.deepEqual(tokens, ['Bearer primero', 'Bearer segundo']);
});

test('sin token rechaza antes de iniciar HTTP', async () => {
  let calls = 0;
  const service = new ReporteConsultaApiService({ async obtenerToken() { return null; } }, undefined, async () => { calls++; return response([]); });
  await assert.rejects(service.listarMisReportes(), error => error.status === 401);
  assert.equal(calls, 0);
});

for (const status of [401, 403, 500]) {
  test(`la lectura conserva HTTP ${status} y el mensaje del backend`, async () => {
    const service = new ReporteConsultaApiService({ async obtenerToken() { return 'token'; } }, undefined, async () => new Response(JSON.stringify({ success: false, message: 'Consulta rechazada' }), { status }));
    await assert.rejects(service.listarMisReportes(), error => error.status === status && error.message === 'Consulta rechazada');
  });
}

test('fallo de red se representa como error y no como lista vacía o mock', async () => {
  let calls = 0;
  const service = new ReporteConsultaApiService({ async obtenerToken() { return 'token'; } }, undefined, async () => { calls++; throw new TypeError('Failed to fetch'); });
  await assert.rejects(service.listarMisReportes(), error => error.status === null);
  assert.equal(calls, 1);
});

test('JSON ilegible no se convierte en consulta exitosa', async () => {
  const service = new ReporteConsultaApiService({ async obtenerToken() { return 'token'; } }, undefined, async () => new Response('<html>Error</html>', { status: 200 }));
  await assert.rejects(service.listarMisReportes(), /no válida/);
});

for (const [caso, data, success] of [
  ['data no es lista', {}, true],
  ['success es falso', [], false],
  ['identidades contradictorias', [{ ...reporte(), idCiudadano: 9 }], true],
  ['identidad inválida', [{ ...reporte(), idUsuario: '1' }], true],
  ['fecha inválida', [{ ...reporte(), fechaCreacion: 'sin fecha' }], true],
]) {
  test(`la consulta rechaza una respuesta donde ${caso}`, async () => {
    const service = new ReporteConsultaApiService({ async obtenerToken() { return 'token'; } }, undefined, async () => response(data, 200, success));
    await assert.rejects(service.listarMisReportes(), /no válida/);
  });
}

// Estado/efectos controlados del hook real. No equivale a un montaje React/Expo.
function createHarness(relativePath, exportName, initialInputs) {
  let inputs = initialInputs;
  const cells = [];
  let cursor = 0, effects = [], writes = 0;
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
      if (!state.setter) state.setter = next => { writes++; state.value = typeof next === 'function' ? next(state.value) : next; };
      return [state.value, state.setter];
    },
    useRef(initial) { return cell('ref', () => ({ current: initial })); },
    useMemo(factory, dependencies) {
      const state = cell('memo', () => ({}));
      if (!same(state.dependencies, dependencies)) { state.value = factory(); state.dependencies = dependencies && [...dependencies]; }
      return state.value;
    },
    useCallback(callback, dependencies) { return hooks.useMemo(() => callback, dependencies); },
    useEffect(effect, dependencies) {
      const state = cell('effect', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.dependencies = dependencies && [...dependencies];
        effects.push(() => { state.cleanup?.(); state.cleanup = effect(); });
      }
    },
  };
  const hook = loadSource(relativePath, { react: hooks })[exportName];
  function render() { cursor = 0; return hook(inputs); }
  function commit() { render(); const pending = effects; effects = []; pending.forEach(effect => effect()); return render(); }
  async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
  return {
    render, commit, flush,
    async settle() { await flush(); return commit(); },
    setInputs(next) { inputs = { ...inputs, ...next }; },
    unmount() { cells.forEach(state => { if (state.kind === 'effect') state.cleanup?.(); }); },
    get writes() { return writes; },
  };
}

function listHarness(overrides = {}) {
  return createHarness('../src/viewModels/useMisReportesViewModel.ts', 'useMisReportesViewModel', {
    consultaService: { async listarMisReportes() { return [reporte()]; } }, session: ciudadano, categorias, solicitudPendiente: null, ...overrides,
  });
}

test('la lista no consulta al montar ni al recargar cerrada; consulta cuando el ciudadano la abre', async () => {
  let calls = 0;
  const harness = listHarness({ consultaService: { async listarMisReportes() { calls++; return [reporte()]; } } });
  let vm = harness.commit();
  assert.equal(vm.visible, false); assert.equal(calls, 0);
  vm.recargar(); harness.commit(); await harness.settle();
  assert.equal(calls, 0);
  vm = harness.commit(); vm.abrir(); harness.commit(); vm = await harness.settle();
  assert.equal(calls, 1); assert.equal(vm.visible, true); assert.deepEqual(ids(vm.filas), [42]);
});

test('el ViewModel filtra defensivamente reportes ajenos y prepara los datos visibles', async () => {
  const harness = listHarness({ consultaService: { async listarMisReportes() { return [reporte(), reporte({ idIncidencia: 99, idUsuario: 8 })]; } } });
  harness.commit().abrir(); harness.commit();
  const vm = await harness.settle();
  assert.deepEqual(ids(vm.filas), [42]);
  assert.equal(vm.filas[0].categoriaNombre, 'Bacheo');
  assert.equal(vm.filas[0].estadoNombre, 'Recibido');
  assert.ok(vm.filas[0].fechaTexto);
  assert.equal(vm.filas[0].puedeConfirmar, false);
});

for (const [caso, session] of [
  ['sin sesión', null], ['otro rol', { ...ciudadano, idRol: 2 }], ['ID inválido', { ...ciudadano, idUsuario: 0 }],
]) {
  test(`abrir con ${caso} no consulta ni presenta reportes`, async () => {
    let calls = 0;
    const harness = listHarness({ session, consultaService: { async listarMisReportes() { calls++; return [reporte()]; } } });
    harness.commit().abrir(); harness.commit();
    const vm = await harness.settle();
    assert.equal(calls, 0); assert.deepEqual(ids(vm.filas), []); assert.ok(vm.error);
  });
}

test('un error de consulta queda visible y recargar permite recuperarse', async () => {
  let calls = 0;
  const harness = listHarness({ consultaService: { async listarMisReportes() { if (++calls === 1) throw new Error('Sin conexión'); return [reporte()]; } } });
  harness.commit().abrir(); harness.commit();
  let vm = await harness.settle();
  assert.match(vm.error, /conexión/); assert.deepEqual(ids(vm.filas), []);
  vm.recargar(); harness.commit(); vm = await harness.settle();
  assert.equal(calls, 2); assert.equal(vm.error, null); assert.deepEqual(ids(vm.filas), [42]);
});

test('una respuesta vieja no reemplaza una consulta iniciada después de cerrar y reabrir', async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const harness = listHarness({ consultaService: { listarMisReportes() { return ++calls === 1 ? first.promise : second.promise; } } });
  let vm = harness.commit(); vm.abrir(); vm = harness.commit();
  vm.cerrar(); vm = harness.commit(); vm.abrir(); harness.commit();
  second.resolve([reporte({ idIncidencia: 52 })]); vm = await harness.settle();
  first.resolve([reporte({ idIncidencia: 42 })]); vm = await harness.settle();
  assert.deepEqual(ids(vm.filas), [52]);
});

test('cambiar de ciudadano retira las filas anteriores y no publica la respuesta de la identidad vieja', async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const harness = listHarness({ consultaService: { listarMisReportes() { return ++calls === 1 ? first.promise : second.promise; } } });
  harness.commit().abrir(); harness.commit();
  harness.setInputs({ session: { ...ciudadano, idUsuario: 8 } });
  let vm = harness.commit();
  assert.deepEqual(ids(vm.filas), []);
  if (!vm.visible) { vm.abrir(); harness.commit(); }
  second.resolve([reporte({ idIncidencia: 80, idUsuario: 8 })]); await harness.settle();
  first.resolve([reporte()]); vm = await harness.settle();
  assert.deepEqual(ids(vm.filas), [80]);
});

test('desmontar evita publicar una consulta ciudadana tardía', async () => {
  const pending = deferred();
  const harness = listHarness({ consultaService: { listarMisReportes() { return pending.promise; } } });
  harness.commit().abrir(); harness.commit(); harness.unmount();
  const writes = harness.writes;
  pending.resolve([reporte()]); await harness.flush();
  assert.equal(harness.writes, writes);
});

test('ofrece comprobación solo para coincidencias de categoría, descripción, coordenadas y foto enviada', async () => {
  const fotoUrl = 'https://ejemplo.test/bache.jpg';
  const rows = [
    reporte({ fotoInicialUrl: fotoUrl }),
    reporte({ idIncidencia: 43, idCategoria: 1, fotoInicialUrl: fotoUrl }),
    reporte({ idIncidencia: 44, descripcion: 'Otro problema', fotoInicialUrl: fotoUrl }),
    reporte({ idIncidencia: 45, latitud: 20.39, fotoInicialUrl: fotoUrl }),
    reporte({ idIncidencia: 46, fotoInicialUrl: 'https://ejemplo.test/otra.jpg' }),
  ];
  const harness = listHarness({ solicitudPendiente: { ...borrador, descripcion: ` ${borrador.descripcion} `, fotoUrl }, consultaService: { async listarMisReportes() { return rows; } } });
  harness.commit().abrir(); harness.commit();
  const vm = await harness.settle();
  assert.equal(vm.requiereComprobacion, true);
  assert.deepEqual(Array.from(vm.filas, fila => fila.puedeConfirmar), [true, false, false, false, false]);
});

function coordinatedHarness(overrides = {}) {
  return createHarness('../src/viewModels/useReportesCiudadanoViewModel.ts', 'useReportesCiudadanoViewModel', {
    catalogoService: { async obtenerDepartamentos() { return [{ idDepartamento: 2, nombre: 'Servicios Públicos' }]; }, async obtenerCategorias() { return categorias; } },
    submissionService: { async crearReporte() { throw new ReporteApiError('Guardado sin confirmar', null, true); } },
    consultaService: { async listarMisReportes() { return [reporte()]; } },
    ejemplosService: { obtenerUbicacion: () => ({ latitud: borrador.latitud, longitud: borrador.longitud, referencia: 'Ejemplo SJR' }), obtenerFoto: () => null },
    session: ciudadano, onCerrarSesion: async () => {}, ...overrides,
  });
}

async function formularioDesconocido(harness, adjuntarFoto = false) {
  harness.commit(); await harness.settle();
  let vm = harness.commit();
  vm.formulario.handleCategoriaChange(4); vm = harness.commit();
  vm.formulario.handleDescripcionChange(borrador.descripcion); vm = harness.commit();
  if (adjuntarFoto) {
    vm.formulario.handleAdjuntarFoto(); vm = harness.commit();
    vm.formulario.handleFotoCargada(vm.formulario.fotoIntento); vm = harness.commit();
  }
  const anterior = vm.formulario;
  await anterior.handleSubmitReporte(); vm = await harness.settle();
  assert.equal(vm.formulario.resultadoDesconocido, true);
  return { vm, anterior };
}

test('consultar una coincidencia no confirma ni limpia automáticamente el borrador desconocido', async () => {
  let posts = 0;
  const harness = coordinatedHarness({ submissionService: { async crearReporte() { posts++; throw new ReporteApiError('Sin confirmar', 500, true); } } });
  let { vm } = await formularioDesconocido(harness);
  vm.formulario.verMisReportes(); harness.commit(); vm = await harness.settle();
  assert.equal(posts, 1); assert.equal(vm.lista.visible, true);
  assert.equal(vm.lista.filas[0].puedeConfirmar, true);
  assert.equal(vm.formulario.resultadoDesconocido, true);
  assert.equal(vm.formulario.descripcion, borrador.descripcion);
});

test('confirmar un ID ajeno o no coincidente no descarta el borrador', async () => {
  const harness = coordinatedHarness({ consultaService: { async listarMisReportes() { return [reporte({ idIncidencia: 99, idUsuario: 8 }), reporte({ idIncidencia: 43, idCategoria: 1 })]; } } });
  let { vm } = await formularioDesconocido(harness);
  vm.formulario.verMisReportes(); harness.commit(); vm = await harness.settle();
  vm.lista.confirmarExistente(99); vm.lista.confirmarExistente(43); vm = harness.commit();
  assert.equal(vm.formulario.resultadoDesconocido, true);
  assert.equal(vm.formulario.descripcion, borrador.descripcion);
  assert.equal(vm.formulario.mensajeComprobacion, null);
});

test('el formulario comprueba el DTO retenido, incluida la foto enviada, aunque se invoque confirmar directamente', async () => {
  const fotoUrl = 'https://ejemplo.test/bache-enviado.jpg';
  let posts = 0;
  const harness = coordinatedHarness({
    submissionService: { async crearReporte() { posts++; throw new ReporteApiError('Sin confirmar', null, true); } },
    ejemplosService: {
      obtenerUbicacion: () => ({ latitud: borrador.latitud, longitud: borrador.longitud, referencia: 'Ejemplo SJR' }),
      obtenerFoto: () => ({ url: fotoUrl, descripcion: 'Bache de ejemplo', credito: 'Fixture de prueba' }),
    },
  });
  let { vm } = await formularioDesconocido(harness, true);
  for (const distinto of [
    { idUsuario: 8 }, { idCategoria: 1 }, { descripcion: 'Otro problema' },
    { latitud: 20.39 }, { longitud: -100.01 }, { fotoInicialUrl: null },
  ]) {
    assert.equal(vm.formulario.confirmarReporteExistente(reporte({ fotoInicialUrl: fotoUrl, ...distinto })), false);
  }
  vm = harness.commit();
  assert.equal(vm.formulario.resultadoDesconocido, true);
  assert.equal(vm.formulario.descripcion, borrador.descripcion);
  assert.equal(vm.formulario.confirmarReporteExistente(reporte({ fotoInicialUrl: fotoUrl, idEstado: 3 })), true);
  vm = harness.commit();
  assert.equal(posts, 1);
  assert.equal(vm.formulario.resultadoDesconocido, false);
  assert.match(vm.formulario.mensajeComprobacion, /42/);
});

test('comprobación manual limpia el borrador con el ID existente y no repite POST ni callbacks anteriores', async () => {
  let posts = 0;
  const harness = coordinatedHarness({ submissionService: { async crearReporte() { posts++; throw new ReporteApiError('Sin confirmar', null, true); } } });
  let { vm, anterior } = await formularioDesconocido(harness);
  vm.formulario.verMisReportes(); harness.commit(); vm = await harness.settle();
  vm.lista.confirmarExistente(42); vm = harness.commit();
  assert.equal(vm.formulario.resultadoDesconocido, false);
  assert.equal(vm.formulario.descripcion, '');
  assert.match(vm.formulario.mensajeComprobacion, /42/);
  assert.equal(vm.lista.visible, false);
  await vm.formulario.handleSubmitReporte(); await anterior.handleSubmitReporte();
  assert.equal(posts, 1);
});

test('recargar retira la lista verificable antes de responder y evita confirmar una fila anterior', async () => {
  const pending = deferred();
  let gets = 0;
  const harness = coordinatedHarness({ consultaService: { listarMisReportes() { return ++gets === 1 ? Promise.resolve([reporte()]) : pending.promise; } } });
  let { vm } = await formularioDesconocido(harness);
  vm.formulario.verMisReportes(); harness.commit(); vm = await harness.settle();
  const anterior = vm.lista;
  anterior.recargar();
  vm = harness.render();
  assert.deepEqual(ids(vm.lista.filas), []);
  anterior.confirmarExistente(42); vm = harness.commit();
  assert.equal(vm.formulario.resultadoDesconocido, true);
  pending.resolve([]); vm = await harness.settle();
  assert.equal(vm.formulario.resultadoDesconocido, true);
});
