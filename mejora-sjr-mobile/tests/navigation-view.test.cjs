const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Se renderiza la composición TSX real en Node. RN y React Navigation son dobles
// explícitos; esta prueba no verifica eventos nativos ni el historial del navegador.
function loadSource(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(name) {
      if (!Object.hasOwn(dependencies, name)) {
        throw new Error(`Dependencia de ejecución no prevista: ${name} en ${relativePath}`);
      }
      return dependencies[name];
    },
  }, { filename });
  return module.exports;
}

const theme = loadSource('../src/constants/theme.ts');
const navigationTypes = loadSource('../src/models/navigation.types.ts');

function renderDestination(overrides = {}) {
  const calls = { containers: 0, navigators: 0, screens: [], stacks: [], presses: [], retries: 0 };
  const decision = {
    destination: 'closing',
    sessionKey: 'closing',
    sessionCloseStatus: 'pending',
    sessionCloseError: null,
    reintentarCierre() { calls.retries += 1; },
    ...overrides,
  };

  const native = {
    View: ({ children }) => React.createElement('div', { 'data-rn': 'View' }, children),
    Text: ({ children, accessibilityRole }) => React.createElement('span', { role: accessibilityRole }, children),
    ActivityIndicator: () => React.createElement('span', { role: 'progressbar', 'aria-label': 'Cargando' }),
    TouchableOpacity: ({ children, disabled, onPress }) => {
      calls.presses.push({ disabled: Boolean(disabled), onPress });
      return React.createElement('button', { disabled: Boolean(disabled) }, children);
    },
    StyleSheet: { create: (styles) => styles },
  };
  const { CustomButton } = loadSource('../src/components/CustomButton.tsx', {
    react: React,
    'react-native': native,
    '../constants/theme': theme,
  });
  const { SessionClosingView } = loadSource('../src/views/SessionClosingView.tsx', {
    react: React,
    'react-native': native,
    '../components/CustomButton': { CustomButton },
    '../constants/theme': theme,
  });

  const stackDouble = (name, label) => () => {
    calls.stacks.push(name);
    return React.createElement('section', { 'data-stack': name }, label);
  };
  const { AppNavigator } = loadSource('../src/navigation/AppNavigator.tsx', {
    react: React,
    'react-native': native,
    '@react-navigation/native': {
      DefaultTheme: { dark: false, colors: {} },
      NavigationContainer: ({ children }) => {
        calls.containers += 1;
        return React.createElement('div', { 'data-navigation': 'container' }, children);
      },
    },
    '@react-navigation/native-stack': {
      createNativeStackNavigator: () => ({
        Navigator: ({ children }) => {
          calls.navigators += 1;
          return React.createElement('div', { 'data-navigation': 'root-stack' }, children);
        },
        Screen: ({ name, component: Component, navigationKey }) => {
          calls.screens.push({ name, navigationKey });
          return React.createElement(Component);
        },
      }),
    },
    'expo-status-bar': { StatusBar: () => null },
    '../models/navigation.types': navigationTypes,
    '../viewModels/useNavigationViewModel': { useNavigationViewModel: () => decision },
    '../views/SplashView': {
      SplashView: () => React.createElement('section', { 'data-view': 'splash' }, 'Splash institucional'),
    },
    '../views/SessionClosingView': { SessionClosingView },
    '../constants/theme': theme,
    './AuthStack': { AuthStack: stackDouble('AuthStack', 'Login') },
    './CitizenStack': { CitizenStack: stackDouble('CitizenStack', 'Crear Reporte') },
    './WorkerStack': { WorkerStack: stackDouble('WorkerStack', 'Bandeja de Tareas') },
  });

  return { html: renderToStaticMarkup(React.createElement(AppNavigator)), calls };
}

function assertNoRouteTree({ html, calls }) {
  assert.equal(calls.containers, 0);
  assert.equal(calls.navigators, 0);
  assert.deepEqual(calls.screens, []);
  assert.deepEqual(calls.stacks, []);
  assert.doesNotMatch(html, /Login|Crear Reporte|Bandeja de Tareas|data-stack=/);
}

for (const sessionCloseStatus of ['idle', 'pending']) {
  test(`closing con cierre ${sessionCloseStatus} muestra espera sin Login ni rutas privadas`, () => {
    const result = renderDestination({ sessionCloseStatus });
    assertNoRouteTree(result);
    assert.match(result.html, /Cerrando sesión/);
    assert.match(result.html, /role="progressbar"/);
    assert.doesNotMatch(result.html, /Reintentar cierre|<button/);
    assert.equal(result.calls.retries, 0);
  });
}

test('closing fallido muestra el error y un reintento habilitado, sin abrir otra rama', () => {
  const result = renderDestination({
    sessionCloseStatus: 'failed',
    sessionCloseError: 'No se pudo eliminar el token anterior.',
  });
  assertNoRouteTree(result);
  assert.match(result.html, /role="alert">No se pudo eliminar el token anterior\./);
  assert.match(result.html, /<button>.*Reintentar cierre.*<\/button>/);
  assert.doesNotMatch(result.html, /role="progressbar"/);
  assert.equal(result.calls.presses.length, 1);
  assert.equal(result.calls.presses[0].disabled, false);
  assert.equal(result.calls.retries, 0);
  // Invocar el callback capturado comprueba el enlace al VM, no un clic del navegador.
  result.calls.presses[0].onPress();
  assert.equal(result.calls.retries, 1);
});

test('splash conserva la pantalla inicial sin montar Login ni rutas privadas', () => {
  const result = renderDestination({ destination: 'splash', sessionKey: 'restoring' });
  assertNoRouteTree(result);
  assert.match(result.html, /data-view="splash"/);
  assert.doesNotMatch(result.html, /Cerrando sesión|Reintentar cierre/);
});

test('auth monta únicamente AuthStack con Login y la identidad pública', () => {
  const result = renderDestination({ destination: 'auth', sessionKey: 'public', sessionCloseStatus: 'idle' });
  assert.equal(result.calls.containers, 1);
  assert.equal(result.calls.navigators, 1);
  assert.deepEqual(result.calls.screens, [{ name: navigationTypes.MOBILE_ROUTES.auth.stack, navigationKey: 'public' }]);
  assert.deepEqual(result.calls.stacks, ['AuthStack']);
  assert.match(result.html, /data-stack="AuthStack">Login/);
  assert.doesNotMatch(result.html, /Cerrando sesión|data-view="splash"|Crear Reporte|Bandeja de Tareas/);
});

for (const [destination, stack, label] of [
  ['citizen', 'CitizenStack', 'Crear Reporte'],
  ['worker', 'WorkerStack', 'Bandeja de Tareas'],
]) {
  test(`${destination} monta únicamente su stack privado con la clave de sesión recibida`, () => {
    const sessionKey = `${destination}-10`;
    const result = renderDestination({ destination, sessionKey, sessionCloseStatus: 'idle' });
    assert.equal(result.calls.containers, 1);
    assert.equal(result.calls.navigators, 1);
    assert.deepEqual(result.calls.screens, [{ name: navigationTypes.MOBILE_ROUTES[destination].stack, navigationKey: sessionKey }]);
    assert.deepEqual(result.calls.stacks, [stack]);
    assert.ok(result.html.includes(label));
    assert.doesNotMatch(result.html, /Login|Cerrando sesión|data-view="splash"/);
  });
}
