'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadSource(relative, hooks) {
  const filename = path.isAbsolute(relative) ? relative : path.resolve(__dirname, '..', relative);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name === 'react') return hooks;
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(filename), name) + '.ts';
      if (existsSync(target)) return loadSource(target, hooks);
    }
    return originalRequire(name);
  };
  loaded._compile(outputText, filename);
  return loaded.exports;
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((ok, no) => { resolve = ok; reject = no; });
  return { promise, resolve, reject };
}

const errorApi = (status, resultadoDesconocido = false) =>
  Object.assign(new Error('Respuesta de prueba'), { status, resultadoDesconocido });
const fila = {
  idSolicitud: 7, idUsuario: 2, nombreUsuario: 'Pedro', email: 'pedro@test.com', idRol: 2,
  rolNombre: 'Trabajador', idDepartamento: 1, departamentoNombre: 'JAPAM', estado: 'PENDIENTE',
  fechaSolicitud: '2026-11-12T12:00:00.000Z', fechaResolucion: null, idSuperadminResolutor: null,
  superadminNombre: null, notasResolucion: null,
};

// Ejecuta los hooks reales con estado/efectos controlados; no simula un montaje React DOM.
function harness(t, { rol = 4, payload = {}, token = 'jwt-inicial', cambiar, listar, reautenticar, aprobar, rechazar, copiar } = {}) {
  const cells = [];
  const effects = [];
  const listeners = new Set();
  const cambios = [];
  const consultas = [];
  const resoluciones = [];
  const copias = [];
  let cursor = 0;
  let desmontado = false;
  let dirty = false;
  let currentToken = token;
  let currentPayload = { idUsuario: rol === 4 ? 4 : 3, idRol: rol, email: 'actor@test.com', exp: Math.floor(Date.now() / 1000) + 3600, ...payload };
  let servicio = { async cambiarPassword(datos) { cambios.push(datos); return cambiar?.(datos); } };
  let consulta = { async listarSolicitudes(estado) { consultas.push(estado); return listar ? listar(estado) : estado === 'PENDIENTE' ? [{ ...fila }] : []; } };
  const gestion = {
    async aprobarSolicitud(id, datos) {
      resoluciones.push({ tipo: 'aprobar', id, datos });
      return aprobar ? aprobar(id, datos) : { idSolicitud: id, estado: 'APROBADA', email: fila.email, passwordTemporal: Buffer.alloc(16, 7).toString('base64url') };
    },
    async rechazarSolicitud(id, datos) {
      resoluciones.push({ tipo: 'rechazar', id, datos });
      return rechazar ? rechazar(id, datos) : { idSolicitud: id, estado: 'RECHAZADA', motivo: datos.motivo };
    },
  };
  const copiado = { async copiarTexto(texto) { copias.push(texto); return copiar?.(texto); } };
  const sesion = { obtenerToken: () => currentToken, decodificarToken: () => currentPayload };
  const observador = { suscribir(callback) { listeners.add(callback); return () => listeners.delete(callback); } };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const cell = (kind, init) => {
    const index = cursor++;
    if (!cells[index]) cells[index] = { kind, ...init() };
    assert.equal(cells[index].kind, kind);
    return cells[index];
  };
  const hooks = {
    useState(initial) {
      const entry = cell('state', () => ({ value: typeof initial === 'function' ? initial() : initial }));
      return [entry.value, next => {
        assert.equal(desmontado, false, 'No debe escribir estado después de desmontarse');
        const value = typeof next === 'function' ? next(entry.value) : next;
        if (!Object.is(value, entry.value)) { entry.value = value; dirty = true; }
      }];
    },
    useRef(initial) { return cell('ref', () => ({ current: initial })); },
    useMemo(fn, deps) {
      const entry = cell('memo', () => ({}));
      if (!same(entry.deps, deps)) { entry.value = fn(); entry.deps = [...deps]; }
      return entry.value;
    },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) {
      const entry = cell('effect', () => ({}));
      if (!same(entry.deps, deps)) {
        entry.deps = [...deps];
        effects.push(() => { entry.cleanup?.(); entry.cleanup = fn(); });
      }
    },
  };
  const { useConfiguracionViewModel } = loadSource('src/viewModels/useConfiguracionViewModel.ts', hooks);
  const reauth = reautenticar || (() => {});
  const render = () => {
    cursor = 0;
    return useConfiguracionViewModel(sesion, {
      cambioClave: servicio, solicitudesConsulta: consulta, solicitudesGestion: gestion,
    }, observador, reauth, copiado);
  };
  const commit = () => {
    let vm;
    for (let n = 0; n < 30; n++) {
      dirty = false;
      vm = render();
      while (effects.length) effects.shift()();
      if (!dirty) return vm;
    }
    throw new Error('Efectos sin estabilizar');
  };
  const api = {
    cambios, consultas, resoluciones, copias, commit,
    async settle() { let vm; for (let n = 0; n < 12; n++) { await Promise.resolve(); vm = commit(); } return vm; },
    sesion(token, datos) { currentToken = token; currentPayload = { ...currentPayload, ...datos }; listeners.forEach(fn => fn()); },
    expirarSinAviso() { currentPayload = { ...currentPayload, exp: Math.floor(Date.now() / 1000) - 1 }; },
    observadores: () => listeners.size,
    setServicio(next) { servicio = next; },
    unmount() {
      if (desmontado) return;
      cells.filter(c => c.kind === 'effect').forEach(c => c.cleanup?.());
      desmontado = true;
    },
    llenar(datos = { passwordActual: 'Password123!', passwordNueva: 'NuevaClave2026!', confirmarPassword: 'NuevaClave2026!' }) {
      let vm = commit();
      for (const [campo, valor] of Object.entries(datos)) { vm.cambio.cambiarCampo(campo, valor); vm = commit(); }
      return vm;
    },
  };
  t.after(() => api.unmount());
  return api;
}

for (const rol of [1, 2, 99, '3']) {
  test(`rol no admitido ${String(rol)} no obtiene permisos ni consulta`, async t => {
    const h = harness(t, { rol });
    const vm = await h.settle();
    assert.equal(vm.acceso.actor, null);
    assert.ok(vm.acceso.errorAcceso);
    assert.equal(vm.cambio.puedeEnviar, false);
    vm.bandeja.recargar(); vm.bandeja.cambiarEstado('APROBADA');
    assert.equal(await vm.cambio.enviar(), false);
    assert.equal(h.consultas.length, 0); assert.equal(h.cambios.length, 0);
  });
}

for (const params of [
  { token: null }, { payload: { exp: undefined } }, { payload: { exp: Infinity } },
  { payload: { exp: 1 } }, { payload: { idUsuario: 0 } }, { payload: { idUsuario: '4' } },
]) {
  test('una sesión incompleta o expirada no consulta ni envía', async t => {
    const h = harness(t, params);
    const vm = await h.settle();
    assert.equal(vm.acceso.actor, null);
    assert.equal(await vm.cambio.enviar(), false);
    assert.deepEqual(h.consultas, []); assert.deepEqual(h.cambios, []);
  });
}

test('rol 3 puede cambiar su clave sin consultar ni obtener tickets para gestionar', async t => {
  const h = harness(t, { rol: 3 });
  let vm = h.llenar();
  assert.equal(vm.cambio.puedeEnviar, true);
  vm.bandeja.recargar(); vm.bandeja.cambiarEstado('APROBADA');
  assert.equal(vm.bandeja.obtenerPendiente(7), null);
  assert.equal(await vm.cambio.enviar(), true);
  vm = await h.settle();
  assert.equal(vm.cambio.estado, 'confirmado');
  assert.equal(h.consultas.length, 0); assert.equal(h.cambios.length, 1);
});

test('valida campos obligatorios antes de llamar al servicio', async t => {
  const h = harness(t);
  let vm = h.commit();
  assert.equal(await vm.cambio.enviar(), false);
  vm = h.commit();
  assert.deepEqual(Object.keys(vm.cambio.errors).sort(), ['confirmarPassword', 'passwordActual', 'passwordNueva']);
  assert.equal(h.cambios.length, 0);
});

for (const datos of [
  { passwordNueva: 'corta', confirmarPassword: 'corta' },
  { passwordNueva: 'á'.repeat(37), confirmarPassword: 'á'.repeat(37) },
  { passwordNueva: 'Password123!', confirmarPassword: 'Password123!' },
  { confirmarPassword: 'OtraClave123!' },
]) {
  test('rechaza longitudes, reutilización o confirmación inválida sin escribir', async t => {
    const h = harness(t);
    const vm = h.llenar({ passwordActual: 'Password123!', passwordNueva: 'NuevaClave2026!', confirmarPassword: 'NuevaClave2026!', ...datos });
    assert.equal(await vm.cambio.enviar(), false);
    assert.equal(h.cambios.length, 0);
  });
}

test('espera confirmación y bloquea dos envíos antes del siguiente render', async t => {
  const pendiente = deferred();
  const h = harness(t, { cambiar: () => pendiente.promise });
  const vm = h.llenar();
  const operacion = vm.cambio.enviar();
  assert.equal(await vm.cambio.enviar(), false);
  assert.equal(h.cambios.length, 1);
  assert.equal(h.commit().cambio.mensajeExito, null);
  pendiente.resolve();
  assert.equal(await operacion, true);
  const actual = await h.settle();
  assert.equal(actual.cambio.estado, 'confirmado');
  assert.deepEqual(actual.cambio.form, { passwordActual: '', passwordNueva: '', confirmarPassword: '' });
});

test('un handler anterior no reenvía el cambio tras confirmar y comenzar otro formulario', async t => {
  const h = harness(t);
  const viejo = h.llenar();
  await viejo.cambio.enviar();
  let vm = await h.settle();
  vm.cambio.nuevoCambio(); vm = h.commit();
  assert.equal(vm.cambio.estado, 'reposo');
  assert.equal(await viejo.cambio.enviar(), false);
  assert.equal(h.cambios.length, 1);
});

test('un rechazo 400 conserva el formulario y permite corregirlo', async t => {
  const h = harness(t, { cambiar: () => { throw errorApi(400); } });
  const vm = h.llenar();
  assert.equal(await vm.cambio.enviar(), false);
  const actual = await h.settle();
  assert.equal(actual.cambio.estado, 'reposo');
  assert.equal(actual.cambio.form.passwordNueva, 'NuevaClave2026!');
  assert.equal(actual.cambio.errorEnvio, 'Respuesta de prueba');
});

for (const fallo of [errorApi(null, true), new TypeError('Conexión perdida')]) {
  test('una escritura incierta conserva datos y bloquea el reenvío hasta verificar el acceso', async t => {
    let reauth = 0;
    const h = harness(t, { cambiar: () => { throw fallo; }, reautenticar: () => { reauth++; } });
    let vm = h.llenar();
    await vm.cambio.enviar();
    vm = await h.settle();
    assert.equal(vm.cambio.estado, 'incierto');
    assert.equal(vm.cambio.form.passwordNueva, 'NuevaClave2026!');
    assert.equal(vm.cambio.puedeEnviar, false);
    assert.equal(await vm.cambio.enviar(), false);
    assert.equal(h.cambios.length, 1);
    await vm.cambio.volverAlLogin();
    assert.equal(reauth, 1);
    assert.equal(h.commit().cambio.form.passwordNueva, '');
  });
}

for (const status of [401, 403]) {
  test(`rechazo ${status} retira acceso, datos y campos sensibles`, async t => {
    const h = harness(t, { cambiar: () => { throw errorApi(status); } });
    await h.llenar().cambio.enviar();
    const vm = await h.settle();
    assert.equal(vm.acceso.actor, null);
    assert.equal(vm.cambio.form.passwordActual, '');
    assert.deepEqual(vm.bandeja.filas, []);
    assert.equal(vm.bandeja.obtenerPendiente(7), null);
  });
}

test('comprueba expiración de nuevo antes de enviar sin depender del botón deshabilitado', async t => {
  const h = harness(t);
  const vm = h.llenar();
  h.expirarSinAviso();
  assert.equal(await vm.cambio.enviar(), false);
  assert.equal(h.cambios.length, 0);
  assert.equal(h.commit().acceso.actor, null);
});

test('una confirmación tardía de otra sesión no anuncia éxito ni restaura sus claves', async t => {
  const pendiente = deferred();
  const h = harness(t, { cambiar: () => pendiente.promise });
  const viejo = h.llenar();
  const enviando = viejo.cambio.enviar();
  h.sesion('jwt-otro-usuario', { idUsuario: 3, idRol: 3, email: 'otra@test.com' });
  h.commit();
  pendiente.resolve();
  assert.equal(await enviando, false);
  const vm = await h.settle();
  assert.equal(vm.acceso.actor.idUsuario, 3);
  assert.equal(vm.cambio.mensajeExito, null);
  assert.equal(vm.cambio.form.passwordNueva, '');
  assert.equal(await viejo.cambio.enviar(), false);
});

test('rol 4 consulta y filtra texto sin volver a solicitar ni mutar filas', async t => {
  const h = harness(t);
  let vm = await h.settle();
  assert.deepEqual(h.consultas, ['PENDIENTE']);
  assert.equal(vm.bandeja.filas.length, 1);
  const copia = vm.bandeja.obtenerPendiente(7);
  copia.nombreUsuario = 'Cambio externo';
  assert.equal(vm.bandeja.obtenerPendiente(7).nombreUsuario, 'Pedro');
  vm.bandeja.cambiarTexto('OTRO'); vm = h.commit();
  assert.deepEqual(vm.bandeja.filas, []);
  vm.bandeja.cambiarTexto('japam'); vm = h.commit();
  assert.equal(vm.bandeja.filas.length, 1);
  assert.equal(h.consultas.length, 1);
});

test('al recargar invalida sin esperar un render la fila que podía seleccionarse', async t => {
  const h = harness(t);
  let vm = await h.settle();
  assert.ok(vm.bandeja.obtenerPendiente(7));
  vm.bandeja.recargar();
  assert.equal(vm.bandeja.obtenerPendiente(7), null);
  vm = await h.settle();
  assert.ok(vm.bandeja.obtenerPendiente(7));
});

test('una respuesta de un filtro anterior no sustituye el filtro vigente', async t => {
  const primera = deferred();
  const aprobada = { ...fila, estado: 'APROBADA' };
  const h = harness(t, { listar: estado => estado === 'PENDIENTE' ? primera.promise : [aprobada] });
  let vm = h.commit();
  vm.bandeja.cambiarEstado('APROBADA');
  vm = await h.settle();
  assert.deepEqual(vm.bandeja.filas, [aprobada]);
  primera.resolve([fila]);
  vm = await h.settle();
  assert.deepEqual(vm.bandeja.filas, [aprobada]);
  assert.equal(vm.bandeja.obtenerPendiente(7), null);
});

test('una consulta tardía no muestra datos tras cambiar a rol 3', async t => {
  const primera = deferred();
  const h = harness(t, { listar: () => primera.promise });
  h.commit();
  h.sesion('jwt-rol3', { idUsuario: 3, idRol: 3 });
  h.commit();
  primera.resolve([fila]);
  const vm = await h.settle();
  assert.equal(vm.bandeja.puedeConsultar, false);
  assert.deepEqual(vm.bandeja.filas, []);
  assert.equal(h.consultas.length, 1);
});

test('un error de lectura conserva los datos visibles pero impide gestionar una respuesta sin verificar', async t => {
  let n = 0;
  const h = harness(t, { listar: () => { if (++n === 2) throw errorApi(null); return [fila]; } });
  let vm = await h.settle();
  vm.bandeja.recargar();
  vm = await h.settle();
  assert.equal(vm.bandeja.filas.length, 1);
  assert.ok(vm.bandeja.errorListado);
  assert.equal(vm.bandeja.obtenerPendiente(7), null);
  vm.bandeja.recargar();
  vm = await h.settle();
  assert.ok(vm.bandeja.obtenerPendiente(7));
});

test('registrar una resolución impide reabrir el ticket aunque una recarga lo devolviera pendiente', async t => {
  const h = harness(t);
  let vm = await h.settle();
  vm.bandeja.registrarResolucion(7);
  assert.equal(vm.bandeja.obtenerPendiente(7), null);
  vm = await h.settle();
  assert.deepEqual(vm.bandeja.filas, []);
  assert.equal(vm.bandeja.obtenerPendiente(7), null);
});

test('el temporizador de expiración retira permisos y datos sin una petición del usuario', async t => {
  const h = harness(t, { payload: { exp: Math.floor(Date.now() / 1000) + 1 } });
  let vm = await h.settle();
  assert.ok(vm.acceso.actor);
  await new Promise(resolve => setTimeout(resolve, vm.acceso.actor.exp * 1000 - Date.now() + 20));
  vm = h.commit();
  assert.equal(vm.acceso.actor, null);
  assert.deepEqual(vm.bandeja.filas, []);
});

test('desmontar retira observadores y descarta promesas pendientes sin escribir estado', async t => {
  const pendiente = deferred();
  const h = harness(t, { cambiar: () => pendiente.promise });
  const enviando = h.llenar().cambio.enviar();
  assert.equal(h.observadores(), 1);
  h.unmount();
  assert.equal(h.observadores(), 0);
  pendiente.resolve();
  assert.equal(await enviando, false);
});

test('rol 3 no puede abrir, comprobar ni resolver tickets mediante handlers directos', async t => {
  const h = harness(t, { rol: 3 });
  const vm = await h.settle();
  assert.equal(vm.resolucion.abrir('aprobar', 7), false);
  assert.equal(vm.resolucion.revisarIncierto(7), false);
  assert.equal(await vm.resolucion.confirmar(), false);
  await vm.resolucion.comprobarResultado();
  assert.deepEqual(h.resoluciones, []); assert.deepEqual(h.consultas, []);
});

test('abrir el diálogo no resuelve y cancelar no escribe', async t => {
  const h = harness(t);
  let vm = await h.settle();
  assert.equal(vm.resolucion.abrir('aprobar', 7), true);
  vm = h.commit();
  assert.equal(vm.resolucion.seleccion.solicitud.idUsuario, 2);
  assert.deepEqual(h.resoluciones, []);
  assert.equal(vm.resolucion.cerrar(), true);
  assert.deepEqual(h.resoluciones, []);
});

test('solo abre una solicitud pendiente del último listado verificado', async t => {
  const h = harness(t);
  let vm = await h.settle();
  assert.equal(vm.resolucion.abrir('aprobar', 99), false);
  vm.bandeja.recargar();
  assert.equal(vm.resolucion.abrir('aprobar', 7), false);
});

test('exige motivo de rechazo y límite de notas antes de escribir', async t => {
  const h = harness(t);
  let vm = await h.settle();
  vm.resolucion.abrir('rechazar', 7); vm = h.commit();
  assert.equal(await vm.resolucion.confirmar(), false);
  assert.ok(h.commit().resolucion.errorCampo);
  vm.resolucion.cerrar(); vm = h.commit();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  vm.resolucion.cambiarNotas('a'.repeat(256)); vm = h.commit();
  assert.equal(await vm.resolucion.confirmar(), false);
  assert.equal(h.resoluciones.length, 0);
});

test('espera confirmación, evita doble envío y conserva visible la clave hasta cerrar', async t => {
  const pendiente = deferred();
  const h = harness(t, { aprobar: () => pendiente.promise });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  const primera = vm.resolucion.confirmar();
  assert.equal(await vm.resolucion.confirmar(), false);
  assert.equal(h.commit().resolucion.claveConfirmada, null);
  assert.equal(h.commit().resolucion.cerrar(), false);
  const resultado = { idSolicitud: 7, estado: 'APROBADA', email: fila.email, passwordTemporal: Buffer.alloc(16, 8).toString('base64url') };
  pendiente.resolve(resultado);
  assert.equal(await primera, true);
  vm = await h.settle();
  assert.equal(h.resoluciones.length, 1);
  assert.deepEqual(vm.resolucion.claveConfirmada, resultado);
  assert.ok(vm.resolucion.seleccion);
  assert.equal(await vm.resolucion.copiarClave(), true);
  assert.deepEqual(h.copias, [resultado.passwordTemporal]);
  vm = h.commit();
  const copiarViejo = vm.resolucion.copiarClave;
  assert.equal(vm.resolucion.cerrar(), true);
  assert.equal(h.commit().resolucion.claveConfirmada, null);
  assert.equal(await copiarViejo(), false);
  assert.equal(h.copias.length, 1);
});

test('rechazo confirmado retira el ticket y no genera una clave', async t => {
  const h = harness(t);
  let vm = await h.settle();
  vm.resolucion.abrir('rechazar', 7); vm = h.commit();
  vm.resolucion.cambiarMotivo('  No reconocido por el empleado  '); vm = h.commit();
  assert.equal(await vm.resolucion.confirmar(), true);
  vm = await h.settle();
  assert.equal(vm.resolucion.estado, 'confirmado');
  assert.equal(vm.resolucion.claveConfirmada, null);
  assert.deepEqual(h.resoluciones, [{ tipo: 'rechazar', id: 7, datos: { motivo: 'No reconocido por el empleado' } }]);
  assert.deepEqual(vm.bandeja.filas, []);
});

test('consulta una aprobación incierta sin reenviar y habilita únicamente un reintento manual', async t => {
  let intentos = 0;
  const h = harness(t, { aprobar: () => {
    if (++intentos === 1) throw errorApi(null, true);
    return { idSolicitud: 7, estado: 'APROBADA', email: fila.email, passwordTemporal: Buffer.alloc(16, 7).toString('base64url') };
  } });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  await vm.resolucion.confirmar(); vm = h.commit();
  assert.equal(vm.resolucion.estado, 'incierto');
  assert.equal(await vm.resolucion.confirmar(), false);
  await vm.resolucion.comprobarResultado(); vm = await h.settle();
  assert.equal(vm.resolucion.estado, 'reintentoDisponible');
  assert.equal(h.resoluciones.length, 1);
  assert.match(vm.resolucion.mensaje, /podría seguir en curso/);
  assert.equal(await vm.resolucion.confirmar(), true);
  assert.equal(h.resoluciones.length, 2);
});

test('si un reintento vuelve a perder la respuesta exige otra consulta', async t => {
  const h = harness(t, { aprobar: () => { throw errorApi(null, true); } });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  await vm.resolucion.confirmar(); vm = h.commit();
  await vm.resolucion.comprobarResultado(); vm = h.commit();
  await vm.resolucion.confirmar(); vm = h.commit();
  assert.equal(vm.resolucion.estado, 'incierto');
  assert.equal(await vm.resolucion.confirmar(), false);
  assert.equal(h.resoluciones.length, 2);
});

for (const estado of ['APROBADA', 'RECHAZADA']) {
  test(`una consulta que encuentra ${estado} cierra la incertidumbre sin inventar una clave`, async t => {
    let enviada = false;
    const h = harness(t, {
      aprobar: () => { enviada = true; throw errorApi(null, true); },
      listar: filtro => !enviada ? filtro === 'PENDIENTE' ? [fila] : [] : filtro === estado ? [{ ...fila, estado }] : [],
    });
    let vm = await h.settle();
    vm.resolucion.abrir('aprobar', 7); vm = h.commit();
    await vm.resolucion.confirmar(); vm = h.commit();
    await vm.resolucion.comprobarResultado(); vm = await h.settle();
    assert.equal(vm.resolucion.estado, 'verificado');
    assert.equal(vm.resolucion.claveConfirmada, null);
    assert.deepEqual(vm.resolucion.sinConfirmar, []);
    assert.equal(h.resoluciones.length, 1);
    assert.equal(await vm.resolucion.confirmar(), false);
  });
}

test('listas vacías después de un fallo no prueban que se pueda reenviar', async t => {
  let enviada = false;
  const h = harness(t, { aprobar: () => { enviada = true; throw errorApi(null, true); }, listar: estado => enviada ? [] : estado === 'PENDIENTE' ? [fila] : [] });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  await vm.resolucion.confirmar(); vm = h.commit();
  await vm.resolucion.comprobarResultado(); vm = h.commit();
  assert.equal(vm.resolucion.estado, 'incierto');
  assert.equal(await vm.resolucion.confirmar(), false);
  assert.equal(h.resoluciones.length, 1);
});

test('cerrar y reabrir conserva el ticket incierto y exige consultar antes de reenviar', async t => {
  const h = harness(t, { aprobar: () => { throw errorApi(null, true); } });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  vm.resolucion.cambiarNotas('Verificado por teléfono'); vm = h.commit();
  await vm.resolucion.confirmar(); vm = h.commit();
  assert.equal(vm.resolucion.cerrar(), true); vm = h.commit();
  assert.equal(vm.resolucion.sinConfirmar.length, 1);
  vm.resolucion.abrir('rechazar', 7); vm = h.commit();
  assert.equal(vm.resolucion.seleccion.tipo, 'aprobar');
  assert.equal(vm.resolucion.notas, 'Verificado por teléfono');
  assert.equal(vm.resolucion.estado, 'incierto');
  assert.equal(await vm.resolucion.confirmar(), false);
  assert.equal(h.resoluciones.length, 1);
});

test('un conflicto 409 exige consultar y no cambia la clave ni presenta éxito', async t => {
  const h = harness(t, { aprobar: () => { throw errorApi(409); } });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  await vm.resolucion.confirmar(); vm = h.commit();
  assert.equal(vm.resolucion.estado, 'incierto');
  assert.equal(vm.resolucion.claveConfirmada, null);
  assert.equal(await vm.resolucion.confirmar(), false);
});

test('un fallo de consulta no habilita un reintento', async t => {
  let enviada = false;
  const h = harness(t, { aprobar: () => { enviada = true; throw errorApi(null, true); }, listar: () => {
    if (enviada) throw errorApi(null); return [fila];
  } });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  await vm.resolucion.confirmar(); vm = h.commit();
  await vm.resolucion.comprobarResultado(); vm = h.commit();
  assert.equal(vm.resolucion.estado, 'incierto');
  assert.equal(await vm.resolucion.confirmar(), false);
});

test('una aprobación tardía después de cambiar sesión no muestra ni copia la clave', async t => {
  const pendiente = deferred();
  const h = harness(t, { aprobar: () => pendiente.promise });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  const enviando = vm.resolucion.confirmar();
  h.sesion('jwt-rol3', { idRol: 3, idUsuario: 3 }); h.commit();
  pendiente.resolve({ idSolicitud: 7, estado: 'APROBADA', email: fila.email, passwordTemporal: Buffer.alloc(16, 7).toString('base64url') });
  assert.equal(await enviando, false);
  vm = await h.settle();
  assert.equal(vm.resolucion.claveConfirmada, null);
  assert.equal(await vm.resolucion.copiarClave(), false);
  assert.deepEqual(h.copias, []);
});

test('un error al copiar conserva la aprobación y permite seleccionar la clave manualmente', async t => {
  const h = harness(t, { copiar: () => { throw new Error('Permiso de portapapeles rechazado'); } });
  let vm = await h.settle();
  vm.resolucion.abrir('aprobar', 7); vm = h.commit();
  await vm.resolucion.confirmar(); vm = await h.settle();
  assert.equal(await vm.resolucion.copiarClave(), false);
  vm = h.commit();
  assert.equal(vm.resolucion.estado, 'confirmado');
  assert.ok(vm.resolucion.claveConfirmada);
  assert.equal(vm.resolucion.mensajeCopiado, 'Permiso de portapapeles rechazado');
  assert.equal(h.resoluciones.length, 1);
});
