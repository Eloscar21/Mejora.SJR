const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);

function compile(relativePath) {
  const filename = path.join(__dirname, relativePath);
  return {
    filename,
    source: ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    }).outputText,
  };
}

const providerModule = compile('../src/providers/AuthProvider.tsx');
const splashModule = compile('../src/viewModels/useSplashViewModel.ts');
const policyModule = compile('../src/viewModels/navigationPolicy.ts');
const policyExports = {};
vm.runInNewContext(policyModule.source, { exports: policyExports }, { filename: policyModule.filename });
const { resolveMobileNavigation } = policyExports;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

/**
 * Runtime controlado de hooks: ejecuta el componente y su JSX reales.
 * No monta React ni reproduce sus efectos, reconciliación o eventos nativos.
 * Los setters no renderizan automáticamente, para comprobar callbacks anteriores
 * y carreras antes del siguiente render en lugar de ocultarlas en el arnés.
 */
function createHarness() {
  const cells = [];
  let cursor = 0;
  const persisted = new Map();
  const claims = new Map();
  const logoutAttempts = [];
  let decodeCalls = 0;

  function hookCell(kind, initialize) {
    const index = cursor++;
    if (!cells[index]) cells[index] = { kind, ...initialize() };
    assert.equal(cells[index].kind, kind, 'el orden de hooks se conserva entre renders');
    return cells[index];
  }

  function useState(initial) {
    const cell = hookCell('state', () => ({ value: typeof initial === 'function' ? initial() : initial }));
    if (!cell.setter) {
      cell.setter = (next) => { cell.value = typeof next === 'function' ? next(cell.value) : next; };
    }
    return [cell.value, cell.setter];
  }

  function useMemo(factory, dependencies) {
    const cell = hookCell('memo', () => ({ initialized: false }));
    if (!cell.initialized || !dependencies || !cell.dependencies ||
      dependencies.length !== cell.dependencies.length ||
      dependencies.some((dependency, index) => !Object.is(dependency, cell.dependencies[index]))) {
      cell.value = factory();
      cell.dependencies = dependencies ? [...dependencies] : undefined;
      cell.initialized = true;
    }
    return cell.value;
  }

  const react = {
    createContext(defaultValue) { return { Provider: Symbol('AuthContext.Provider'), defaultValue }; },
    createElement(type, props, ...children) { return { type, props: { ...props, children } }; },
    useState,
    useMemo,
    useCallback(callback, dependencies) { return useMemo(() => callback, dependencies); },
    useRef(initial) { return hookCell('ref', () => ({ value: { current: initial } })).value; },
    useContext() { throw new Error('El arnés lee el value del Provider, sin montar consumidores React.'); },
  };

  const storage = {
    async getItem(key) { return persisted.get(key) ?? null; },
    async setItem(key, value) { persisted.set(key, value); },
    async removeItem(key) { persisted.delete(key); },
    async clear() { persisted.clear(); },
  };
  const authService = {
    async obtenerToken() { return persisted.get('token') ?? null; },
    async obtenerUsuario() {
      const saved = persisted.get('usuario');
      return saved ? JSON.parse(saved) : null;
    },
    decodificarToken(token) { decodeCalls += 1; return claims.get(token) ?? null; },
    async validarTokenActivo(token) {
      const payload = claims.get(token);
      return typeof payload?.exp === 'number' && Number.isFinite(payload.exp) && payload.exp > NOW / 1000;
    },
    logout() {
      const attempt = deferred();
      logoutAttempts.push(attempt);
      // Representa el borrado del almacenamiento al completar el driver, no antes.
      return attempt.promise.then(() => { persisted.clear(); });
    },
  };
  const catalogoService = {};
  class UnexpectedDefaultService {
    constructor() { throw new Error('La prueba debe usar los servicios personalizados inyectados.'); }
  }
  const dependencies = {
    react: { __esModule: true, default: react, ...react },
    '../services/mocks/MockAuthService': { MockAuthService: UnexpectedDefaultService },
    '../services/api/AuthApiService': { AuthApiService: UnexpectedDefaultService },
    '../services/mocks/MockCatalogoService': { MockCatalogoService: UnexpectedDefaultService },
    '../services/api/CatalogoApiService': { CatalogoApiService: UnexpectedDefaultService },
    '../services/storage/StorageService': { defaultStorageService: storage },
  };
  const providerExports = {};
  vm.runInNewContext(providerModule.source, {
    exports: providerExports,
    require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `import previsto: ${name}`);
      return dependencies[name];
    },
  }, { filename: providerModule.filename });

  function render() {
    cursor = 0;
    const tree = providerExports.AuthProvider({
      children: null, authService, catalogoService, storageService: storage,
    });
    return tree.props.value;
  }

  function credentials(role = 1, userId = 10, decodedRole = role) {
    const token = `token-${role}-${userId}-${claims.size}`;
    const session = {
      idUsuario: userId, nombre: `Usuario ${userId}`, email: `usuario${userId}@example.com`,
      idRol: role, idDepartamento: role === 2 || role === 3 ? 1 : null,
    };
    const decodedToken = {
      ...session, idRol: decodedRole, iat: NOW / 1000 - 60, exp: NOW / 1000 + 300,
    };
    claims.set(token, decodedToken);
    return { token, session, decodedToken };
  }

  function persist(identity) {
    persisted.set('token', identity.token);
    persisted.set('usuario', JSON.stringify(identity.session));
  }

  async function signIn(identity = credentials()) {
    persist(identity);
    await render().establecerSesion(identity.token, identity.session);
    render().finalizarRestauracion();
    return render();
  }

  function runSplash() {
    const effects = [];
    const splashExports = {};
    vm.runInNewContext(splashModule.source, {
      exports: splashExports,
      require(name) {
        if (name === 'react') return { useEffect(effect) { effects.push(effect); } };
        if (name === '../providers/AuthProvider') return { useAuth: () => render() };
        throw new Error(`Dependencia de splash no prevista: ${name}`);
      },
      // Solo se sustituye la espera visual; el cuerpo asíncrono y finally son reales.
      setTimeout(callback) { callback(); return 1; },
    }, { filename: splashModule.filename });
    splashExports.useSplashViewModel();
    const cleanups = effects.map((effect) => effect());
    return () => cleanups.forEach((cleanup) => { if (typeof cleanup === 'function') cleanup(); });
  }

  return {
    render, credentials, persist, signIn, runSplash, persisted, logoutAttempts,
    get decodeCalls() { return decodeCalls; },
  };
}

function decision(context) {
  return resolveMobileNavigation({
    isRestoringSession: context.isRestoringSession,
    sessionCloseStatus: context.sessionCloseStatus,
    token: context.token, session: context.session, decodedToken: context.decodedToken,
  }, NOW);
}

async function allowLogoutToStart() {
  // El Provider difiere logout a una microtarea para publicar su promesa compartida primero.
  await Promise.resolve();
}

function assertClosed(context) {
  assert.equal(context.sessionCloseStatus, 'idle');
  assert.equal(context.sessionCloseError, null);
  assert.equal(context.token, null);
  assert.equal(context.session, null);
  assert.equal(context.decodedToken, null);
}

test('el Provider inicia restaurando y solo habilita Login vacío al finalizarla', () => {
  const harness = createHarness();
  let context = harness.render();
  assert.equal(context.sessionCloseStatus, 'idle');
  assert.equal(decision(context).destination, 'splash');
  context.finalizarRestauracion();
  context = harness.render();
  assertClosed(context);
  assert.equal(decision(context).destination, 'auth');
});

test('un cierre pendiente comparte la misma promesa antes y después del render', async () => {
  const harness = createHarness();
  const previous = await harness.signIn();
  assert.equal(decision(previous).destination, 'citizen');
  const first = previous.cerrarSesion();
  const second = previous.cerrarSesion();
  assert.equal(first, second);
  const pending = harness.render();
  assert.equal(pending.sessionCloseStatus, 'pending');
  assert.equal(pending.sessionCloseError, null);
  assert.equal(decision(pending).destination, 'closing');
  assert.equal(first, pending.cerrarSesion());
  await allowLogoutToStart();
  assert.equal(harness.logoutAttempts.length, 1);
  assert.ok(harness.persisted.size > 0);

  harness.logoutAttempts[0].resolve();
  await Promise.all([first, second]);
  const closed = harness.render();
  assertClosed(closed);
  assert.equal(harness.persisted.size, 0);
  assert.equal(decision(closed).destination, 'auth');
});

test('un callback anterior no admite otra sesión antes del render de pending', async () => {
  const harness = createHarness();
  const previous = await harness.signIn(harness.credentials(1, 10));
  const next = harness.credentials(2, 20);
  const decodingBefore = harness.decodeCalls;
  const closing = previous.cerrarSesion();
  await assert.rejects(previous.establecerSesion(next.token, next.session), /cierre/);
  assert.equal(harness.decodeCalls, decodingBefore);
  const pending = harness.render();
  assert.equal(pending.session.idUsuario, 10);
  assert.equal(decision(pending).destination, 'closing');
  await allowLogoutToStart();
  assert.equal(harness.logoutAttempts.length, 1);
  harness.logoutAttempts[0].resolve();
  await closing;
  assertClosed(harness.render());
});

test('Login sigue bloqueado al resolverse el driver, hasta completar la limpieza del Provider', async () => {
  const harness = createHarness();
  const previous = await harness.signIn();
  const next = harness.credentials(2, 20);
  const closing = previous.cerrarSesion();
  await allowLogoutToStart();
  const attempt = harness.logoutAttempts[0];
  // El callback se ejecuta al resolver el driver, antes de los then/finally del Provider.
  const prematureAdmission = attempt.promise.then(() => previous.establecerSesion(next.token, next.session));
  const rejected = assert.rejects(prematureAdmission, /cierre/);
  attempt.resolve();
  await rejected;
  await closing;
  assertClosed(harness.render());
});

test('un fallo de borrado mantiene failed, informa error y bloquea admisión mediante callback anterior', async () => {
  const harness = createHarness();
  const previous = await harness.signIn();
  const next = harness.credentials(2, 20);
  const closing = previous.cerrarSesion();
  const failure = new Error('Driver de almacenamiento bloqueado');
  const rejected = assert.rejects(closing, (error) => error === failure);
  await allowLogoutToStart();
  harness.logoutAttempts[0].reject(failure);
  await rejected;

  const failed = harness.render();
  assert.equal(failed.sessionCloseStatus, 'failed');
  assert.match(failed.sessionCloseError, /sesión guardada/);
  assert.equal(decision(failed).destination, 'closing');
  assert.ok(harness.persisted.size > 0);
  await assert.rejects(previous.establecerSesion(next.token, next.session), /cierre/);
  assert.equal(harness.render().session.idUsuario, 10);
});

test('el reintento comparte una operación nueva y solo su éxito permite la próxima sesión', async () => {
  const harness = createHarness();
  const previous = await harness.signIn();
  const next = harness.credentials(2, 20);
  const first = previous.cerrarSesion();
  const firstRejected = assert.rejects(first, /fallo/);
  await allowLogoutToStart();
  harness.logoutAttempts[0].reject(new Error('fallo inicial'));
  await firstRejected;
  assert.equal(harness.render().sessionCloseStatus, 'failed');

  const retry = previous.cerrarSesion();
  assert.notEqual(retry, first);
  assert.equal(retry, previous.cerrarSesion());
  const pending = harness.render();
  assert.equal(pending.sessionCloseStatus, 'pending');
  assert.equal(pending.sessionCloseError, null);
  assert.equal(retry, pending.cerrarSesion());
  await assert.rejects(previous.establecerSesion(next.token, next.session), /cierre/);
  await allowLogoutToStart();
  assert.equal(harness.logoutAttempts.length, 2);
  harness.logoutAttempts[1].resolve();
  await retry;
  assertClosed(harness.render());
  assert.equal(harness.persisted.size, 0);

  harness.persist(next);
  await previous.establecerSesion(next.token, next.session);
  const admitted = harness.render();
  assert.equal(admitted.session.idUsuario, 20);
  assert.equal(admitted.token, next.token);
  assert.equal(decision(admitted).destination, 'worker');
  await Promise.resolve();
  assert.equal(harness.persisted.get('token'), next.token);
  assert.equal(harness.logoutAttempts.length, 2);
});

test('el éxito del cierre permite un login posterior sin que un cierre viejo borre sus datos', async () => {
  const harness = createHarness();
  const previous = await harness.signIn();
  const next = harness.credentials(1, 11);
  const closing = previous.cerrarSesion();
  await allowLogoutToStart();
  harness.logoutAttempts[0].resolve();
  await closing;
  assertClosed(harness.render());

  harness.persist(next);
  await previous.establecerSesion(next.token, next.session);
  const admitted = harness.render();
  assert.equal(decision(admitted).sessionKey, 'citizen-11');
  assert.equal(admitted.token, next.token);
  await Promise.resolve();
  assert.equal(harness.persisted.get('token'), next.token);
  assert.equal(harness.logoutAttempts.length, 1);
});

for (const [role, decodedRole, warning] of [[3, 3, /panel web/], [4, 4, /panel web/], [99, 99, /no admitido/], [1, 2, /no admitido/]]) {
  test(`rechazar rol ${role} y claim ${decodedRole} utiliza el mismo cierre coordinado`, async () => {
    const harness = createHarness();
    const previous = await harness.signIn();
    const denied = harness.credentials(role, 30, decodedRole);
    const next = harness.credentials(2, 20);
    harness.persist(denied);
    const rejection = previous.establecerSesion(denied.token, denied.session);
    const pending = harness.render();
    assert.equal(pending.sessionCloseStatus, 'pending');
    assert.match(pending.roleWarning, warning);
    assert.equal(decision(pending).destination, 'closing');
    const sharedClosing = pending.cerrarSesion();
    await assert.rejects(previous.establecerSesion(next.token, next.session), /cierre/);
    await allowLogoutToStart();
    assert.equal(harness.logoutAttempts.length, 1);
    harness.logoutAttempts[0].resolve();
    await Promise.all([rejection, sharedClosing]);
    const closed = harness.render();
    assertClosed(closed);
    assert.match(closed.roleWarning, warning);
    assert.equal(decision(closed).destination, 'auth');
  });
}

test('el rechazo de rol con borrado fallido mantiene Login bloqueado hasta reintentar', async () => {
  const harness = createHarness();
  const previous = await harness.signIn();
  const denied = harness.credentials(4, 40);
  harness.persist(denied);
  const rejection = previous.establecerSesion(denied.token, denied.session);
  await allowLogoutToStart();
  harness.logoutAttempts[0].reject(new Error('No se pudo borrar'));
  // establecerSesion conserva el error de cierre como estado, sin admitir ese rol.
  await rejection;
  const failed = harness.render();
  assert.equal(failed.sessionCloseStatus, 'failed');
  assert.match(failed.roleWarning, /panel web/);
  assert.match(failed.sessionCloseError, /sesión guardada/);
  assert.equal(decision(failed).destination, 'closing');
  const next = harness.credentials(1, 11);
  await assert.rejects(previous.establecerSesion(next.token, next.session), /cierre/);

  const retry = failed.cerrarSesion();
  await allowLogoutToStart();
  harness.logoutAttempts[1].resolve();
  await retry;
  assertClosed(harness.render());
  assert.equal(decision(harness.render()).destination, 'auth');
});

test('splash conserva prioridad durante un cierre de hidratación y luego expone failed', async () => {
  const harness = createHarness();
  const initial = harness.render();
  const closing = initial.cerrarSesion();
  const rejected = assert.rejects(closing, /hidratación/);
  const pending = harness.render();
  assert.equal(pending.isRestoringSession, true);
  assert.equal(pending.sessionCloseStatus, 'pending');
  assert.equal(decision(pending).destination, 'splash');
  await allowLogoutToStart();
  harness.logoutAttempts[0].reject(new Error('borrado durante hidratación'));
  await rejected;
  const failed = harness.render();
  assert.equal(failed.sessionCloseStatus, 'failed');
  assert.equal(decision(failed).destination, 'splash');
  failed.finalizarRestauracion();
  assert.equal(decision(harness.render()).destination, 'closing');
});

for (const fails of [false, true]) {
  test(`el hook Splash real espera la limpieza y libera restauración después de ${fails ? 'fallar' : 'confirmar'} el borrado`, async (t) => {
    const harness = createHarness();
    const expired = harness.credentials();
    expired.decodedToken.exp = NOW / 1000 - 1;
    harness.persist(expired);
    const cleanup = harness.runSplash();
    t.after(cleanup);

    for (let tick = 0; tick < 12 && harness.logoutAttempts.length === 0; tick += 1) {
      await Promise.resolve();
    }
    assert.equal(harness.logoutAttempts.length, 1, 'el efecto real del splash inició el cierre');
    const pending = harness.render();
    assert.equal(pending.sessionCloseStatus, 'pending');
    assert.equal(pending.isRestoringSession, true);
    assert.equal(decision(pending).destination, 'splash');
    // Unirse a la operación no dispara otro borrado; Splash permanece montado.
    const outcome = pending.cerrarSesion().then(() => 'ok', () => 'failed');
    if (fails) harness.logoutAttempts[0].reject(new Error('Almacenamiento no disponible'));
    else harness.logoutAttempts[0].resolve();
    assert.equal(await outcome, fails ? 'failed' : 'ok');
    for (let tick = 0; tick < 6; tick += 1) await Promise.resolve();

    const finished = harness.render();
    assert.equal(finished.isRestoringSession, false, 'el finally real de Splash libera la hidratación');
    assert.equal(harness.logoutAttempts.length, 1);
    if (fails) {
      assert.equal(finished.sessionCloseStatus, 'failed');
      assert.match(finished.sessionCloseError, /sesión guardada/);
      assert.ok(harness.persisted.size > 0);
      assert.equal(decision(finished).destination, 'closing');
    } else {
      assertClosed(finished);
      assert.equal(harness.persisted.size, 0);
      assert.equal(decision(finished).destination, 'auth');
    }
  });
}
