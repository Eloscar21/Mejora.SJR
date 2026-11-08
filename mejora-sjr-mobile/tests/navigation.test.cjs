const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Se ejecutan la política y las constantes reales sin cargar módulos nativos de React Native.
function loadTypeScript(relativePath) {
  const filename = path.join(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exportsObject = {};
  vm.runInNewContext(compiled, {
    exports: exportsObject,
    require(name) { throw new Error(`Dependencia de ejecución no prevista: ${name}`); },
  }, { filename });
  return exportsObject;
}

const { resolveMobileNavigation } = loadTypeScript('../src/viewModels/navigationPolicy.ts');
const { MOBILE_ROUTES } = loadTypeScript('../src/models/navigation.types.ts');
const routers = import('@react-navigation/routers');
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const FUTURE_EXP = NOW / 1000 + 60;

function sessionState(role = 1, userId = 10) {
  return {
    isRestoringSession: false,
    sessionCloseStatus: 'idle',
    token: 'token-de-prueba',
    session: {
      idUsuario: userId,
      nombre: 'Usuario de prueba',
      email: 'usuario@example.com',
      idRol: role,
      idDepartamento: role === 2 ? 1 : null,
    },
    decodedToken: {
      idUsuario: userId,
      email: 'usuario@example.com',
      idRol: role,
      idDepartamento: role === 2 ? 1 : null,
      iat: NOW / 1000 - 60,
      exp: FUTURE_EXP,
    },
  };
}

function assertDecision(state, destination, sessionKey) {
  const decision = resolveMobileNavigation(state, NOW);
  // Comparar los campos evita depender de prototipos entre contextos de vm.
  assert.equal(decision.destination, destination);
  assert.equal(decision.sessionKey, sessionKey);
  return decision;
}

test('la restauración conserva splash mientras no se resuelva una sesión', () => {
  assertDecision({
    isRestoringSession: true, sessionCloseStatus: 'idle', token: null, session: null, decodedToken: null,
  }, 'splash', 'restoring');
});

test('la restauración tiene prioridad incluso con datos de una sesión válida', () => {
  assertDecision({ ...sessionState(), isRestoringSession: true }, 'splash', 'restoring');
});

for (const [label, token] of [['ausente', null], ['vacío', ''], ['solo espacios', '   ']]) {
  test(`un token ${label} con credenciales residuales requiere cierre antes de Login`, () => {
    assertDecision({ ...sessionState(), token }, 'closing', 'closing');
  });
}

test('sin usuario guardado no restaura una sesión aunque exista token', () => {
  assertDecision({ ...sessionState(), session: null }, 'closing', 'closing');
});

test('un token sin payload decodificado requiere cierre antes de Login', () => {
  assertDecision({ ...sessionState(), decodedToken: null }, 'closing', 'closing');
});

for (const [label, exp] of [
  ['vencido', NOW / 1000 - 1],
  ['igual al instante actual', NOW / 1000],
  ['ausente', undefined],
  ['nulo', null],
  ['texto numérico', String(FUTURE_EXP)],
  ['NaN', NaN],
  ['infinito', Infinity],
  ['infinito negativo', -Infinity],
]) {
  test(`exp ${label} no permite restauración`, () => {
    const state = sessionState();
    state.decodedToken.exp = exp;
    assertDecision(state, 'closing', 'closing');
  });
}

test('un exp futuro permite la rama ciudadana para rol 1', () => {
  assertDecision(sessionState(1), 'citizen', 'citizen-10');
});

test('un exp futuro permite la rama de trabajador para rol 2', () => {
  assertDecision(sessionState(2), 'worker', 'worker-10');
});

test('exp puede ser fraccionario si sigue estrictamente en el futuro', () => {
  const state = sessionState();
  state.decodedToken.exp = NOW / 1000 + 0.5;
  assertDecision(state, 'citizen', 'citizen-10');
});

for (const role of [3, 4, 0, 99, '1', '2']) {
  test(`el rol ${JSON.stringify(role)} se queda fuera de las ramas privadas móviles`, () => {
    assertDecision(sessionState(role), 'closing', 'closing');
  });
}

for (const [decodedRole, userRole] of [[1, 2], [2, 1], [1, '1'], [2, '2']]) {
  test(`rechaza discrepancia entre rol JWT ${JSON.stringify(decodedRole)} y usuario ${JSON.stringify(userRole)}`, () => {
    const state = sessionState(decodedRole);
    state.session.idRol = userRole;
    assertDecision(state, 'closing', 'closing');
  });
}

test('la clave de identidad cambia entre usuarios y entre ramas', () => {
  const citizen10 = resolveMobileNavigation(sessionState(1, 10), NOW);
  const citizen11 = resolveMobileNavigation(sessionState(1, 11), NOW);
  const worker10 = resolveMobileNavigation(sessionState(2, 10), NOW);
  const publicState = resolveMobileNavigation({
    isRestoringSession: false, sessionCloseStatus: 'idle', token: null, session: null, decodedToken: null,
  }, NOW);
  assert.notEqual(citizen10.sessionKey, citizen11.sessionKey);
  assert.notEqual(citizen10.sessionKey, worker10.sessionKey);
  assert.notEqual(citizen10.sessionKey, publicState.sessionKey);
});

test('Login solo se habilita sin token, usuario ni claims y con cierre idle', () => {
  assertDecision({
    isRestoringSession: false, sessionCloseStatus: 'idle',
    token: null, session: null, decodedToken: null,
  }, 'auth', 'public');
});

for (const residual of ['token', 'session', 'decodedToken']) {
  test(`un resto aislado de ${residual} bloquea Login hasta terminar el cierre`, () => {
    const source = sessionState();
    assertDecision({
      isRestoringSession: false, sessionCloseStatus: 'idle',
      token: null, session: null, decodedToken: null,
      [residual]: source[residual],
    }, 'closing', 'closing');
  });
}

for (const sessionCloseStatus of ['pending', 'failed']) {
  test(`el cierre ${sessionCloseStatus} bloquea la rama privada aunque la sesión sea válida`, () => {
    assertDecision({ ...sessionState(), sessionCloseStatus }, 'closing', 'closing');
  });

  test(`el cierre ${sessionCloseStatus} bloquea Login aunque el estado local esté vacío`, () => {
    assertDecision({
      isRestoringSession: false, sessionCloseStatus,
      token: null, session: null, decodedToken: null,
    }, 'closing', 'closing');
  });

  test(`splash conserva prioridad sobre cierre ${sessionCloseStatus} durante la hidratación`, () => {
    assertDecision({ ...sessionState(), isRestoringSession: true, sessionCloseStatus }, 'splash', 'restoring');
  });
}

function routeOptions(decision, routeKeyChanges = []) {
  return {
    routeNames: [MOBILE_ROUTES[decision.destination].stack],
    routeParamList: {},
    routeGetIdList: {},
    routeKeyChanges,
  };
}

for (const [role, deniedDestination] of [[1, 'worker'], [2, 'citizen']]) {
  test(`StackRouter rechaza navegación de rol ${role} a la rama ${deniedDestination}`, async () => {
    const { StackRouter, StackActions, CommonActions } = await routers;
    const decision = resolveMobileNavigation(sessionState(role), NOW);
    const options = routeOptions(decision);
    const router = StackRouter({});
    const state = router.getInitialState(options);
    const deniedRoute = MOBILE_ROUTES[deniedDestination].stack;

    assert.equal(state.routes[0].name, MOBILE_ROUTES[decision.destination].stack);
    assert.equal(state.routeNames.includes(deniedRoute), false);
    assert.equal(router.getStateForAction(state, StackActions.push(deniedRoute), options), null);
    assert.equal(router.getStateForAction(state, CommonActions.navigate(deniedRoute), options), null);
    assert.equal(router.getStateForAction(state, CommonActions.preload(deniedRoute), options), null);
  });
}

for (const role of [1, 2]) {
  test(`logout retira historial y precargas de la rama privada del rol ${role}`, async () => {
    const { StackRouter, StackActions, CommonActions } = await routers;
    const decision = resolveMobileNavigation(sessionState(role), NOW);
    const options = routeOptions(decision);
    const router = StackRouter({});
    const privateRoute = MOBILE_ROUTES[decision.destination];
    const initial = router.getInitialState(options);
    // Preparar historial y precarga privados con acciones del router real.
    const history = router.getStateForAction(initial, StackActions.push(privateRoute.stack, {
      screen: privateRoute.screen, privateDraft: 'borrador-de-prueba',
    }), options);
    assert.ok(history);
    const privateState = router.getStateForAction(history, CommonActions.preload(privateRoute.stack, {
      screen: privateRoute.screen, privateDraft: 'precarga-de-prueba',
    }), options);
    assert.ok(privateState);
    assert.ok(privateState.routes.length > 1);
    assert.ok(privateState.preloadedRoutes.length > 0);

    const loggedOut = resolveMobileNavigation({
      isRestoringSession: false, sessionCloseStatus: 'idle', token: null, session: null, decodedToken: null,
    }, NOW);
    const publicOptions = routeOptions(loggedOut);
    const publicState = router.getStateForRouteNamesChange(privateState, publicOptions);
    const previousKeys = new Set([
      ...privateState.routes.map((route) => route.key),
      ...privateState.preloadedRoutes.map((route) => route.key),
    ]);

    assert.deepEqual(publicState.routeNames, [MOBILE_ROUTES.auth.stack]);
    assert.deepEqual(publicState.routes.map((route) => route.name), [MOBILE_ROUTES.auth.stack]);
    assert.equal(publicState.routes.some((route) => previousKeys.has(route.key)), false);
    assert.equal(publicState.preloadedRoutes.length, 0);
    assert.equal(publicState.index, 0);
    assert.equal(JSON.stringify(publicState).includes('privateDraft'), false);
    assert.equal(router.getStateForAction(publicState, CommonActions.goBack(), publicOptions), null);
    assert.equal(router.getStateForAction(publicState, CommonActions.navigate(privateRoute.stack), publicOptions), null);
  });
}

test('cambiar de usuario con el mismo rol retira el estado de la identidad anterior', async () => {
  const { StackRouter, StackActions, CommonActions } = await routers;
  const oldIdentity = resolveMobileNavigation(sessionState(1, 10), NOW);
  const nextIdentity = resolveMobileNavigation(sessionState(1, 11), NOW);
  assert.notEqual(oldIdentity.sessionKey, nextIdentity.sessionKey);
  const router = StackRouter({});
  const oldOptions = routeOptions(oldIdentity);
  const initial = router.getInitialState(oldOptions);
  const history = router.getStateForAction(initial, StackActions.push(MOBILE_ROUTES.citizen.stack, {
    privateDraft: 'usuario-10',
  }), oldOptions);
  assert.ok(history);
  const previous = router.getStateForAction(history, CommonActions.preload(MOBILE_ROUTES.citizen.stack, {
    privateDraft: 'precarga-usuario-10',
  }), oldOptions);
  assert.ok(previous);

  // navigationKey cambia: React Navigation informa routeKeyChanges para esa ruta.
  const nextOptions = routeOptions(nextIdentity, [MOBILE_ROUTES.citizen.stack]);
  const next = router.getStateForRouteNamesChange(previous, nextOptions);
  assert.equal(next.routes.length, 1);
  assert.equal(next.routes[0].name, MOBILE_ROUTES.citizen.stack);
  assert.notEqual(next.routes[0].key, initial.routes[0].key);
  assert.equal(next.routes[0].params, undefined);
  assert.equal(next.preloadedRoutes.length, 0);
  assert.equal(next.index, 0);
  assert.equal(JSON.stringify(next).includes('privateDraft'), false);
  assert.equal(router.getStateForAction(next, CommonActions.goBack(), nextOptions), null);
});
