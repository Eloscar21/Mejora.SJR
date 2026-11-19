'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const MockUsuarioRepository = require('../../mejora-sjr-backend/src/repositories/MockUsuarioRepository');
const MockIncidenciaRepository = require('../../mejora-sjr-backend/src/repositories/MockIncidenciaRepository');
const PerfilService = require('../../mejora-sjr-backend/src/services/PerfilService');

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
    loaded.require = (name) => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), name);
        const target = [base, `${base}.ts`, `${base}.tsx`].find(
          (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()
        );
        if (target && /\.tsx?$/.test(target)) return load(target);
      }
      return ordinary(name);
    };
    loaded._compile(source, filename);
    return loaded.exports;
  }
  return load(path.resolve(__dirname, relativePath));
}

function createHarness(overrides = {}) {
  const cells = [];
  let cursor = 0;
  let effects = [];
  let inputs = { ...overrides };

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
        state.dependencies = dependencies && [...dependencies];
      }
      return state.value;
    },
    useCallback(callback, dependencies) {
      return hooks.useMemo(() => callback, dependencies);
    },
    useEffect(effect, dependencies) {
      const state = cell('effect', () => ({}));
      if (!same(state.dependencies, dependencies)) {
        state.dependencies = dependencies && [...dependencies];
        effects.push(() => {
          state.cleanup?.();
          state.cleanup = effect();
        });
      }
    },
  };

  const { useMisDatosViewModel } = loadSource('../src/viewModels/useMisDatosViewModel.ts', {
    react: hooks,
  });

  function render() {
    cursor = 0;
    return useMisDatosViewModel(inputs);
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

test('US-032 (Backend): PerfilService consulta y actualiza datos personales y contraseña del ciudadano', async () => {
  const usuarioRepo = new MockUsuarioRepository();
  const incidenciaRepo = new MockIncidenciaRepository([
    {
      idIncidencia: 1,
      descripcion: 'Fuga de agua en centro',
      latitud: 20.388,
      longitud: -99.995,
      idUsuario: 1,
      idCategoria: 1,
      idEstado: 1,
    },
    {
      idIncidencia: 2,
      descripcion: 'Bache en avenida principal',
      latitud: 20.389,
      longitud: -99.996,
      idUsuario: 1,
      idCategoria: 4,
      idEstado: 4,
    },
  ]);

  const service = new PerfilService(usuarioRepo, incidenciaRepo);

  // 1. Consulta perfil del ciudadano (idUsuario = 1)
  const perfilInicial = await service.obtenerPerfil({ idUsuario: 1 });
  assert.equal(perfilInicial.idUsuario, 1);
  assert.equal(perfilInicial.nombre, 'Ciudadano Juan');
  assert.equal(perfilInicial.email, 'ciudadano@test.com');
  assert.equal(perfilInicial.resumenReportes.total, 2);
  assert.equal(perfilInicial.resumenReportes.recibidos, 1);
  assert.equal(perfilInicial.resumenReportes.resueltos, 1);

  // 2. Actualiza nombre y correo
  const actualizado = await service.actualizarPerfil(
    {
      nombre: 'Juan Pérez Ciudadano',
      email: 'juan.perez@sjr.mx',
    },
    { idUsuario: 1 }
  );

  assert.equal(actualizado.usuario.nombre, 'Juan Pérez Ciudadano');
  assert.equal(actualizado.usuario.email, 'juan.perez@sjr.mx');

  // 3. Rechaza correo ya ocupado por otro usuario (admin@test.com)
  await assert.rejects(
    service.actualizarPerfil(
      { nombre: 'Juan Pérez', email: 'admin@test.com' },
      { idUsuario: 1 }
    ),
    (err) => err.statusCode === 409
  );

  // 4. Actualiza contraseña desde "Mis Datos"
  const conPassword = await service.actualizarPerfil(
    {
      nombre: 'Juan Pérez Ciudadano',
      email: 'juan.perez@sjr.mx',
      passwordActual: 'Password123!',
      passwordNueva: 'NuevaClaveSJR2026!',
      confirmarPassword: 'NuevaClaveSJR2026!',
    },
    { idUsuario: 1 }
  );
  assert.match(conPassword.mensaje, /contraseña/);
});

test('US-032 (Móvil MVVM): useMisDatosViewModel abre modal, valida campos, actualiza perfil y sincroniza sesión', async () => {
  const { MockPerfilService } = loadSource('../src/services/mocks/MockPerfilService.ts', {
    '../storage/StorageService': {
      defaultStorageService: {
        async getItem() {
          return null;
        },
        async setItem() {},
        async removeItem() {},
      },
    },
  });

  const sesionInicial = {
    idUsuario: 1,
    nombre: 'Ciudadano Juan',
    email: 'ciudadano@test.com',
    idRol: 1,
    idDepartamento: null,
  };
  let sesionSincronizada = null;

  const perfilService = new MockPerfilService({
    async obtenerUsuario() {
      return sesionInicial;
    },
  });

  const harness = createHarness({
    perfilService,
    session: sesionInicial,
    onActualizarSesion(nueva) {
      sesionSincronizada = nueva;
    },
  });

  let vm = harness.commit();
  assert.equal(vm.visible, false);

  // Abrir apartado "Mis Datos"
  vm.abrir();
  vm = await harness.settle();
  assert.equal(vm.visible, true);
  assert.equal(vm.nombre, 'Ciudadano Juan');
  assert.equal(vm.email, 'ciudadano@test.com');
  assert.equal(vm.perfil.resumenReportes.total, 3);

  // Intentar guardar nombre inválido (< 3 caracteres)
  vm.setNombre('AB');
  vm = harness.commit();
  await vm.guardarCambios();
  vm = await harness.settle();
  assert.match(vm.errors.nombre, /3 caracteres/);

  // Guardar nombre y correo válidos
  vm.setNombre('Oscar Ciudadano SJR');
  vm.setEmail('oscar.ciudadano@sjr.mx');
  vm = harness.commit();
  await vm.guardarCambios();
  vm = await harness.settle();

  assert.equal(vm.errors.nombre, undefined);
  assert.match(vm.mensajeExito, /correctamente/);
  assert.equal(sesionSincronizada.nombre, 'Oscar Ciudadano SJR');
  assert.equal(sesionSincronizada.email, 'oscar.ciudadano@sjr.mx');
});
