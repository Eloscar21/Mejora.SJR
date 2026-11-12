'use strict';

const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadSource(relative, deps = {}) {
  const filename = path.isAbsolute(relative) ? relative : path.resolve(__dirname, '..', relative);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }, fileName: filename,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => {
    if (Object.hasOwn(deps, name)) return deps[name];
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(filename), name) + '.ts';
      if (existsSync(target)) return loadSource(target, deps);
    }
    return original(name);
  };
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const respuesta = { success: true, message: 'Autenticado', data: { token: 'jwt-de-prueba', usuario: { idUsuario: 4, idRol: 4 } } };
function deferred() { let resolve; const promise = new Promise(ok => { resolve = ok; }); return { promise, resolve }; }

function harness(t, login, motivo = null) {
  const cells = [];
  const effects = [];
  let cursor = 0, dirty = false, mounted = true;
  const llamadas = [], navegaciones = [], cierres = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const cell = (kind, init) => { const i = cursor++; if (!cells[i]) cells[i] = { kind, ...init() }; assert.equal(cells[i].kind, kind); return cells[i]; };
  const hooks = {
    useState(initial) {
      const c = cell('state', () => ({ value: typeof initial === 'function' ? initial() : initial }));
      return [c.value, next => {
        assert.equal(mounted, true);
        const value = typeof next === 'function' ? next(c.value) : next;
        if (!Object.is(c.value, value)) { c.value = value; dirty = true; }
      }];
    },
    useRef(initial) { return cell('ref', () => ({ current: initial })); },
    useCallback(fn, deps) {
      const c = cell('callback', () => ({}));
      if (!same(c.deps, deps)) { c.value = fn; c.deps = [...deps]; }
      return c.value;
    },
    useEffect(fn, deps) {
      const c = cell('effect', () => ({}));
      if (!same(c.deps, deps)) { c.deps = [...deps]; effects.push(() => { c.cleanup?.(); c.cleanup = fn(); }); }
    },
  };
  const { useLoginViewModel } = loadSource('src/viewModels/useLoginViewModel.ts', { react: hooks });
  const servicio = { async login(datos) { llamadas.push(datos); return login(datos); }, logout() { cierres.push(true); } };
  const navegar = () => navegaciones.push('/dashboard');
  const commit = () => {
    let vm;
    for (let n = 0; n < 20; n++) {
      dirty = false; cursor = 0;
      vm = useLoginViewModel(servicio, navegar, motivo);
      while (effects.length) effects.shift()();
      if (!dirty) return vm;
    }
    throw new Error('No se estabilizó el ViewModel');
  };
  const unmount = () => {
    if (!mounted) return;
    cells.filter(c => c.kind === 'effect').forEach(c => c.cleanup?.());
    mounted = false;
  };
  t.after(unmount);
  return {
    llamadas, navegaciones, cierres, commit, unmount,
    llenar() { const vm = commit(); vm.handleEmailChange('admin@test.com'); vm.handlePasswordChange('Password123!'); return commit(); },
  };
}

test('un error de conexión se muestra sin autenticar con mocks ni navegar', async t => {
  const h = harness(t, () => { throw new Error('No se pudo conectar con el servidor.'); });
  await h.llenar().handleSubmit();
  const vm = h.commit();
  assert.match(vm.errorMessage, /conectar/);
  assert.deepEqual(h.navegaciones, []);
  assert.equal(h.llamadas.length, 1);
  assert.equal(vm.password, 'Password123!');
  assert.equal(vm.isLoading, false);
});

test('un Failed to fetch no activa ninguna ruta alternativa de autenticación', async t => {
  const h = harness(t, () => { throw new TypeError('Failed to fetch'); });
  await h.llenar().handleSubmit();
  assert.equal(h.commit().errorMessage, 'Failed to fetch');
  assert.equal(h.llamadas.length, 1); assert.deepEqual(h.navegaciones, []);
});

test('un rechazo de credenciales conserva el formulario y permite un intento manual nuevo', async t => {
  const h = harness(t, () => { throw new Error('Credenciales inválidas.'); });
  await h.llenar().handleSubmit();
  assert.equal(h.commit().email, 'admin@test.com');
  await h.commit().handleSubmit();
  assert.equal(h.llamadas.length, 2); assert.deepEqual(h.navegaciones, []);
});

test('no consulta autenticación con campos vacíos', async t => {
  const h = harness(t, () => respuesta);
  await h.commit().handleSubmit();
  assert.equal(h.llamadas.length, 0);
  assert.ok(h.commit().errorMessage);
});

test('un login pendiente bloquea doble envío y solo navega después de confirmar', async t => {
  const pendiente = deferred();
  const h = harness(t, () => pendiente.promise);
  const vm = h.llenar();
  const primera = vm.handleSubmit();
  await vm.handleSubmit();
  assert.equal(h.llamadas.length, 1); assert.deepEqual(h.navegaciones, []);
  assert.equal(h.commit().isLoading, true);
  pendiente.resolve(respuesta); await primera;
  assert.deepEqual(h.navegaciones, ['/dashboard']);
  assert.equal(h.commit().password, '');
  await vm.handleSubmit();
  assert.equal(h.llamadas.length, 1);
});

for (const invalida of [{ success: false }, { success: true }, { success: true, data: { token: '  ' } }]) {
  test('no navega sin confirmación de autenticación y token', async t => {
    const h = harness(t, () => invalida);
    await h.llenar().handleSubmit();
    assert.ok(h.commit().errorMessage);
    assert.deepEqual(h.navegaciones, []);
  });
}

test('un servicio demo inyectado explícitamente utiliza el mismo contrato', async t => {
  const h = harness(t, () => respuesta);
  await h.llenar().handleSubmit();
  assert.equal(h.llamadas.length, 1);
  assert.deepEqual(h.navegaciones, ['/dashboard']);
});

test('una respuesta tardía después de desmontar no navega ni escribe estado', async t => {
  const pendiente = deferred();
  const h = harness(t, () => pendiente.promise);
  const enviando = h.llenar().handleSubmit();
  h.unmount(); pendiente.resolve(respuesta); await enviando;
  assert.deepEqual(h.navegaciones, []);
});

test('conserva los avisos de sesión expirada y rol restringido del middleware', t => {
  const expirada = harness(t, () => respuesta, 'session_expired');
  assert.match(expirada.commit().infoMessage, /sesión ha expirado/);
  assert.equal(expirada.cierres.length, 1);
  const restringida = harness(t, () => respuesta, 'unauthorized_role');
  assert.match(restringida.commit().errorMessage, /Acceso denegado/);
  assert.equal(restringida.cierres.length, 1);
});

test('AuthApiService traduce el fallo de fetch y no guarda cookies ni inventa un token', async t => {
  const guardados = [];
  const { AuthApiService } = loadSource('src/services/api/AuthApiService.ts', {
    'js-cookie': { set: (...args) => guardados.push(args) },
  });
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(() => new AuthApiService('http://servidor.test/api').login({ email: 'admin@test.com', password: 'Password123!' }), error => {
    assert.match(error.message, /No se pudo conectar con el servidor/);
    assert.equal(error.status, null);
    return true;
  });
  assert.deepEqual(guardados, []);
});
