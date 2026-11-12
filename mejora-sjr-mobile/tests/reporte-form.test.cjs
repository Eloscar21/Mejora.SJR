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
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
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

const errorModule = loadSource('../src/services/api/ReporteApiError.ts');
const { ReporteApiError } = errorModule;
const categorias = [
  { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1, departamentoNombre: 'JAPAM' },
  { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2, departamentoNombre: 'Servicios Públicos' },
];
const departamentos = [{ idDepartamento: 1, nombre: 'JAPAM' }, { idDepartamento: 2, nombre: 'Servicios Públicos' }];
const ciudadano = { idUsuario: 1, nombre: 'Ciudadano de prueba', email: 'ciudadano@test.com', idRol: 1, idDepartamento: null };
const descripcion = 'Bache profundo frente al parque municipal';
const ubicacion = { latitud: 20.3889, longitud: -99.9961, referencia: 'Centro de SJR, ubicación de ejemplo' };
const foto = categoria => ({ url: `https://ejemplo.test/evidencia/${categoria.idCategoria}.jpg`, descripcion: `Ejemplo: ${categoria.nombre}`, credito: 'Material de prueba' });
const ejemplosService = { obtenerUbicacion: () => ({ ...ubicacion }), obtenerFoto: categoria => foto(categoria) };
const catalogoService = { async obtenerDepartamentos() { return departamentos; }, async obtenerCategorias() { return categorias; } };
const ids = items => Array.from(items, item => item.value);
const plain = value => JSON.parse(JSON.stringify(value));
function confirmado(dto, idIncidencia = 42) {
  return {
    idIncidencia, descripcion: dto.descripcion, latitud: dto.latitud, longitud: dto.longitud,
    idUsuario: ciudadano.idUsuario, idCategoria: dto.idCategoria, idEstado: 1,
    fechaCreacion: '2026-11-11T12:00:00.000Z',
    evidencias: dto.fotoUrl ? [{ idEvidencia: 1, idIncidencia, tipoEvidencia: 'INICIAL', fotoUrl: dto.fotoUrl, fechaSubida: '2026-11-11T12:00:00.000Z' }] : [],
  };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

// Ejecuta el hook TypeScript real con estado/efectos controlados; no monta React/Expo.
function createHarness(overrides = {}) {
  let inputs = {
    catalogoService,
    submissionService: { async crearReporte(dto) { return confirmado(dto); } },
    ejemplosService,
    session: ciudadano,
    onCerrarSesion: async () => {},
    ...overrides,
  };
  const cells = [];
  let cursor = 0, writes = 0, effects = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  function cell(kind, initialize) {
    const index = cursor++;
    if (!cells[index]) cells[index] = { kind, ...initialize() };
    assert.equal(cells[index].kind, kind);
    return cells[index];
  }
  const hooks = {
    useState(initial) {
      const state = cell('state', () => ({ value: typeof initial === 'function' ? initial() : initial }));
      return [state.value, next => { writes++; state.value = typeof next === 'function' ? next(state.value) : next; }];
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
  const { useReporteViewModel } = loadSource('../src/viewModels/useReporteViewModel.ts', {
    react: hooks,
    '../services/api/ReporteApiError': errorModule,
  });
  function render() { cursor = 0; return useReporteViewModel(inputs); }
  function commit() {
    render();
    const pending = effects; effects = []; pending.forEach(effect => effect());
    return render();
  }
  async function flush() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
  return {
    commit, flush,
    async settle() { await flush(); return commit(); },
    setInputs(next) { inputs = { ...inputs, ...next }; },
    unmount() { cells.forEach(state => { if (state.kind === 'effect') state.cleanup?.(); }); },
    get writes() { return writes; },
  };
}

async function ready(overrides = {}) {
  const harness = createHarness(overrides);
  harness.commit(); await harness.settle();
  return harness;
}
function llenar(harness, adjuntar = true) {
  let vm = harness.commit();
  vm.handleCategoriaChange(4); vm = harness.commit();
  vm.handleDescripcionChange(descripcion); vm = harness.commit();
  if (adjuntar) {
    vm.handleAdjuntarFoto(); vm = harness.commit();
    vm.handleFotoCargada(vm.fotoIntento); vm = harness.commit();
  }
  return vm;
}

test('el catálogo carga por las dependencias y elegir categoría resuelve su departamento', async () => {
  const harness = await ready();
  let vm = harness.commit();
  assert.equal(vm.isLoadingCatalogos, false);
  assert.deepEqual(ids(vm.departamentosItems), [1, 2]);
  vm.handleCategoriaChange(4); vm = harness.commit();
  assert.equal(vm.selectedCategoria, 4);
  assert.equal(vm.selectedDepartamento, 2);
  assert.deepEqual(plain(vm.coordenadas), { lat: ubicacion.latitud, lng: ubicacion.longitud });
  assert.equal(vm.referenciaUbicacion, ubicacion.referencia);
});

test('envía exclusivamente el DTO de US-023 y usa el ID confirmado por el servicio', async () => {
  const enviados = [];
  const harness = await ready({ submissionService: { async crearReporte(dto) { enviados.push(dto); return confirmado(dto, 73); } } });
  let vm = llenar(harness);
  assert.equal(vm.puedeEnviar, true);
  await vm.handleSubmitReporte(); vm = await harness.settle();
  assert.deepEqual(plain(enviados), [{ descripcion, idCategoria: 4, latitud: ubicacion.latitud, longitud: ubicacion.longitud, fotoUrl: foto(categorias[1]).url }]);
  assert.equal(vm.reporteCreado.idIncidencia, 73);
  assert.equal(vm.descripcion, '');
  assert.equal(vm.selectedCategoria, null);
  assert.equal(vm.fotoEvidencia, null);
  assert.equal(vm.isSubmitting, false);
});

test('la foto opcional no bloquea el formulario y se incluye cuando onLoad confirma su carga', async () => {
  const enviados = [];
  const harness = await ready({ submissionService: { async crearReporte(dto) { enviados.push(dto); return confirmado(dto); } } });
  let vm = llenar(harness, false);
  vm.handleAdjuntarFoto(); vm = harness.commit();
  assert.equal(vm.estadoFoto, 'loading');
  assert.equal(vm.fotoEvidencia.url, foto(categorias[1]).url);
  assert.equal(vm.puedeEnviar, true);
  vm.handleFotoCargada(vm.fotoIntento); vm = harness.commit();
  assert.equal(vm.estadoFoto, 'ready');
  assert.equal(vm.puedeEnviar, true);
  await vm.handleSubmitReporte(); await harness.settle();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].fotoUrl, foto(categorias[1]).url);
});

for (const estado of ['loading', 'error']) {
  test(`foto en ${estado}: guarda una vez los datos del reporte sin enviar fotoUrl`, async () => {
    const enviados = [];
    const harness = await ready({ submissionService: { async crearReporte(dto) { enviados.push(dto); return confirmado(dto, 95); } } });
    let vm = llenar(harness, false);
    vm.handleAdjuntarFoto(); vm = harness.commit();
    if (estado === 'error') { vm.handleFotoError(vm.fotoIntento); vm = harness.commit(); }
    assert.equal(vm.estadoFoto, estado);
    assert.equal(vm.puedeEnviar, true);
    await vm.handleSubmitReporte(); vm = await harness.settle();
    assert.equal(enviados.length, 1);
    assert.equal(Object.hasOwn(enviados[0], 'fotoUrl'), false);
    assert.deepEqual(plain(enviados[0]), {
      descripcion, idCategoria: 4, latitud: ubicacion.latitud, longitud: ubicacion.longitud,
    });
    assert.equal(vm.reporteCreado.idIncidencia, 95);
    assert.deepEqual(plain(vm.reporteCreado.evidencias), []);
  });
}

test('cambiar categoría limpia la foto anterior e ignora los eventos de una carga vieja', async () => {
  const harness = await ready();
  let vm = llenar(harness, false);
  vm.handleAdjuntarFoto(); vm = harness.commit();
  const anterior = vm.fotoIntento;
  vm.handleCategoriaChange(1); vm = harness.commit();
  assert.equal(vm.fotoEvidencia, null);
  vm.handleAdjuntarFoto(); vm = harness.commit();
  const actual = vm.fotoIntento;
  assert.notEqual(actual, anterior);
  assert.equal(vm.fotoEvidencia.url, foto(categorias[0]).url);
  vm.handleFotoCargada(anterior); vm.handleFotoError(anterior); vm = harness.commit();
  assert.equal(vm.estadoFoto, 'loading');
  vm.handleFotoCargada(actual); vm = harness.commit();
  assert.equal(vm.estadoFoto, 'ready');
});

test('cambiar a un departamento incompatible limpia categoría y fotografía', async () => {
  const harness = await ready();
  let vm = llenar(harness);
  vm.handleDepartamentoChange(1); vm = harness.commit();
  assert.equal(vm.selectedDepartamento, 1);
  assert.equal(vm.selectedCategoria, null);
  assert.equal(vm.fotoEvidencia, null);
  assert.equal(vm.estadoFoto, 'idle');
});

test('un error de imagen es visible y reintentar crea otro intento para la misma categoría', async () => {
  const harness = await ready();
  let vm = llenar(harness, false);
  vm.handleAdjuntarFoto(); vm = harness.commit();
  const anterior = vm.fotoIntento;
  vm.handleFotoError(anterior); vm = harness.commit();
  assert.equal(vm.estadoFoto, 'error');
  assert.equal(vm.puedeEnviar, true);
  assert.ok(Object.values(vm.errors).some(Boolean));
  vm.handleReintentarFoto(); vm = harness.commit();
  assert.notEqual(vm.fotoIntento, anterior);
  assert.equal(vm.estadoFoto, 'loading');
  assert.equal(vm.fotoEvidencia.url, foto(categorias[1]).url);
  vm.handleFotoCargada(vm.fotoIntento); vm = harness.commit();
  assert.equal(vm.estadoFoto, 'ready');
});

test('quitar la evidencia permite enviar sin foto según el contrato opcional de US-023', async () => {
  const enviados = [];
  const harness = await ready({ submissionService: { async crearReporte(dto) { enviados.push(dto); return confirmado(dto); } } });
  let vm = llenar(harness);
  vm.handleEliminarFoto(); vm = harness.commit();
  assert.equal(vm.fotoEvidencia, null);
  await vm.handleSubmitReporte(); await harness.settle();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].fotoUrl, undefined);
});

test('doble toque y callbacks anteriores al render solo producen un POST y no alteran el borrador pendiente', async () => {
  const pending = deferred();
  const enviados = [];
  const harness = await ready({ submissionService: { crearReporte(dto) { enviados.push(dto); return pending.promise; } } });
  const anterior = llenar(harness);
  const first = anterior.handleSubmitReporte();
  const second = anterior.handleSubmitReporte();
  anterior.handleDescripcionChange('Cambio durante el envío');
  anterior.handleCategoriaChange(1); anterior.handleEliminarFoto(); anterior.handleAdjuntarFoto();
  let vm = harness.commit();
  assert.equal(enviados.length, 1);
  assert.equal(vm.isSubmitting, true);
  assert.equal(vm.formularioBloqueado, true);
  assert.equal(vm.descripcion, descripcion);
  assert.equal(vm.selectedCategoria, 4);
  assert.equal(vm.fotoEvidencia.url, foto(categorias[1]).url);
  assert.equal(vm.reporteCreado, null);
  pending.resolve(confirmado(enviados[0], 88));
  await Promise.all([first, second]); vm = await harness.settle();
  assert.equal(vm.reporteCreado.idIncidencia, 88);
  assert.equal(vm.isSubmitting, false);
});

test('un 400 conserva los datos y permite corregir y reenviar expresamente', async () => {
  const enviados = [];
  const harness = await ready({ submissionService: { async crearReporte(dto) {
    enviados.push(dto);
    if (enviados.length === 1) throw new ReporteApiError('Descripción rechazada', 400);
    return confirmado(dto, 91);
  } } });
  let vm = llenar(harness);
  await vm.handleSubmitReporte(); vm = await harness.settle();
  assert.equal(vm.descripcion, descripcion);
  assert.equal(vm.selectedCategoria, 4);
  assert.equal(vm.fotoEvidencia.url, foto(categorias[1]).url);
  assert.equal(vm.reporteCreado, null);
  assert.equal(vm.resultadoDesconocido, false);
  assert.equal(vm.formularioBloqueado, false);
  assert.match(vm.errors.general, /rechazada/);
  vm.handleDescripcionChange(`${descripcion} junto a la escuela`); vm = harness.commit();
  await vm.handleSubmitReporte(); vm = await harness.settle();
  assert.equal(enviados.length, 2);
  assert.equal(vm.reporteCreado.idIncidencia, 91);
});

test('el éxito bloquea callbacks antiguos hasta cerrar la confirmación y preparar otro formulario', async () => {
  let calls = 0;
  const harness = await ready({ submissionService: { async crearReporte(dto) { return confirmado(dto, 40 + ++calls); } } });
  const anterior = llenar(harness);
  await anterior.handleSubmitReporte();
  let vm = await harness.settle();
  assert.equal(vm.reporteCreado.idIncidencia, 41);
  assert.equal(vm.formularioBloqueado, true);
  anterior.handleDescripcionChange('Cambio tardío'); anterior.handleCategoriaChange(1);
  await anterior.handleSubmitReporte();
  vm = harness.commit();
  assert.equal(calls, 1);
  assert.equal(vm.descripcion, '');
  assert.equal(vm.selectedCategoria, null);
  vm.cerrarModalExito(); harness.commit();
  vm = llenar(harness);
  await vm.handleSubmitReporte(); vm = await harness.settle();
  assert.equal(calls, 2);
  assert.equal(vm.reporteCreado.idIncidencia, 42);
});

for (const status of [null, 500]) {
  test(`resultado desconocido (${status}) conserva y bloquea datos sin admitir otro POST`, async () => {
    let calls = 0;
    const harness = await ready({ submissionService: { async crearReporte() { calls++; throw new ReporteApiError('Guardado sin confirmar', status, true); } } });
    const anterior = llenar(harness);
    await anterior.handleSubmitReporte();
    let vm = await harness.settle();
    assert.equal(vm.resultadoDesconocido, true);
    assert.equal(vm.formularioBloqueado, true);
    assert.equal(vm.puedeEnviar, false);
    vm.handleDescripcionChange('Cambio después del error'); vm.handleCategoriaChange(1); vm.handleEliminarFoto();
    await anterior.handleSubmitReporte(); await vm.handleSubmitReporte(); vm = harness.commit();
    assert.equal(calls, 1);
    assert.equal(vm.descripcion, descripcion);
    assert.equal(vm.selectedCategoria, 4);
    assert.equal(vm.fotoEvidencia.url, foto(categorias[1]).url);
    assert.equal(vm.reporteCreado, null);
  });
}

test('error de catálogo bloquea el envío y su reintento recupera las opciones', async () => {
  let fallar = true, calls = 0;
  const harness = createHarness({
    catalogoService: { async obtenerDepartamentos() { if (fallar) throw new Error('Catálogo no disponible'); return departamentos; }, async obtenerCategorias() { return categorias; } },
    submissionService: { async crearReporte(dto) { calls++; return confirmado(dto); } },
  });
  harness.commit(); let vm = await harness.settle();
  assert.match(vm.errorCatalogos, /no disponible/);
  assert.equal(vm.puedeEnviar, false);
  await vm.handleSubmitReporte(); assert.equal(calls, 0);
  fallar = false; await vm.cargarCatalogos(); vm = await harness.settle();
  assert.equal(vm.errorCatalogos, null);
  assert.deepEqual(ids(vm.categoriasItems), [1, 4]);
});

test('campos incompletos no producen una escritura', async () => {
  let calls = 0;
  const harness = await ready({ submissionService: { async crearReporte(dto) { calls++; return confirmado(dto); } } });
  let vm = harness.commit();
  await vm.handleSubmitReporte(); vm = await harness.settle();
  assert.equal(calls, 0);
  assert.ok(vm.errors.categoria);
  assert.ok(vm.errors.descripcion);
  assert.equal(vm.reporteCreado, null);
});

for (const [caso, session] of [
  ['sin sesión', null],
  ['trabajador', { ...ciudadano, idRol: 2 }],
  ['administrador', { ...ciudadano, idRol: 3 }],
  ['Superadmin', { ...ciudadano, idRol: 4 }],
  ['rol desconocido', { ...ciudadano, idRol: 99 }],
  ['ID de ciudadano inválido', { ...ciudadano, idUsuario: 0 }],
  ['rol textual', { ...ciudadano, idRol: '1' }],
]) {
  test(`actor ${caso}: no habilita envío ni produce POST aunque el formulario esté completo`, async () => {
    let calls = 0;
    const harness = await ready({ session, submissionService: { async crearReporte(dto) { calls++; return confirmado(dto); } } });
    let vm = llenar(harness);
    assert.equal(vm.puedeEnviar, false);
    await vm.handleSubmitReporte(); vm = await harness.settle();
    assert.equal(calls, 0);
    assert.equal(vm.puedeEnviar, false);
    assert.equal(vm.reporteCreado, null);
    assert.ok(vm.errors.general);
  });
}

test('desmontar impide publicar una respuesta de creación tardía', async () => {
  const pending = deferred();
  let enviado;
  const harness = await ready({ submissionService: { crearReporte(dto) { enviado = dto; return pending.promise; } } });
  const vm = llenar(harness);
  const operation = vm.handleSubmitReporte();
  harness.unmount();
  const writes = harness.writes;
  pending.resolve(confirmado(enviado)); await operation; await harness.flush();
  assert.equal(harness.writes, writes);
});

test('desmontar impide publicar catálogos tardíos', async () => {
  const pending = deferred();
  const harness = createHarness({ catalogoService: { async obtenerDepartamentos() { return departamentos; }, obtenerCategorias() { return pending.promise; } } });
  harness.commit(); harness.unmount();
  const writes = harness.writes;
  pending.resolve(categorias); await harness.flush();
  assert.equal(harness.writes, writes);
});

test('cerrar sesión delega en la dependencia inyectada y espera su operación', async () => {
  const pending = deferred();
  let calls = 0, finalizado = false;
  const harness = await ready({ onCerrarSesion: () => { calls++; return pending.promise; } });
  const operation = harness.commit().cerrarSesion().then(() => { finalizado = true; });
  await harness.flush();
  assert.equal(calls, 1);
  assert.equal(finalizado, false);
  pending.resolve(); await operation;
  assert.equal(finalizado, true);
});

test('el servicio de ejemplos entrega fotos distintas por categoría, sin inventar una para desconocidas', () => {
  const { MockReporteEjemploService } = loadSource('../src/services/mocks/MockReporteEjemploService.ts');
  const service = new MockReporteEjemploService();
  const conocidas = [
    { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1 },
    { idCategoria: 2, nombre: 'Alcantarillado', idDepartamento: 1 },
    { idCategoria: 3, nombre: 'Alumbrado', idDepartamento: 2 },
    { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2 },
  ];
  const urls = conocidas.map(categoria => {
    const result = service.obtenerFoto(categoria);
    assert.ok(result);
    assert.match(result.url, /^https?:\/\//);
    assert.ok(result.url.length <= 255);
    assert.ok(result.descripcion);
    assert.ok(result.credito);
    assert.equal(service.obtenerFoto(categoria).url, result.url);
    return result.url;
  });
  assert.equal(new Set(urls).size, conocidas.length);
  assert.equal(service.obtenerFoto({ idCategoria: 999, nombre: 'Sin ejemplo', idDepartamento: 2 }), null);
  const location = service.obtenerUbicacion();
  assert.ok(location.latitud >= 20.2 && location.latitud <= 20.6);
  assert.ok(location.longitud >= -100.2 && location.longitud <= -99.8);
  assert.ok(location.referencia);
  Reflect.set(location, 'latitud', 0);
  assert.notEqual(service.obtenerUbicacion().latitud, 0);
});
