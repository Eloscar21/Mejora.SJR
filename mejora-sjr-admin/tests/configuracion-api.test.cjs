'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadSource(relativePath) {
  const filename = path.isAbsolute(relativePath) ? relativePath : path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name.startsWith('.')) {
      const target = path.resolve(path.dirname(filename), name);
      if (existsSync(`${target}.ts`)) return loadSource(`${target}.ts`);
    }
    return originalRequire(name);
  };
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const { crearConfiguracionApiServices } = loadSource('src/providers/crearConfiguracionApiServices.ts');
const cambio = { passwordActual: '  Actual123!  ', passwordNueva: '  NuevaClave2026!  ', confirmarPassword: '  NuevaClave2026!  ' };
const temporal = Buffer.alloc(16, 7).toString('base64url');
const pendiente = {
  idSolicitud: 7, idUsuario: 2, nombreUsuario: 'Pedro', email: 'pedro@test.com', idRol: 2,
  rolNombre: 'Trabajador', idDepartamento: 1, departamentoNombre: 'JAPAM', estado: 'PENDIENTE',
  fechaSolicitud: '2026-11-12T12:00:00.000Z', fechaResolucion: null, idSuperadminResolutor: null,
  superadminNombre: null, notasResolucion: null,
};
const aprobacion = { idSolicitud: 7, estado: 'APROBADA', email: 'pedro@test.com', passwordTemporal: temporal };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function crear(fetcher, token = 'jwt-actual') {
  const peticiones = [];
  const sesion = { obtenerToken: () => token };
  const servicios = crearConfiguracionApiServices(sesion, 'http://servidor.test/api///', async (url, init) => {
    peticiones.push({ url, init });
    return fetcher(url, init);
  });
  return { servicios, peticiones, setToken: value => { token = value; } };
}

async function falla(operacion, status, desconocido) {
  await assert.rejects(operacion, error => {
    assert.equal(error.name, 'PasswordApiError');
    assert.equal(error.status, status);
    assert.equal(error.resultadoDesconocido, desconocido);
    return true;
  });
}

test('cambia la clave propia con el contrato exacto, sin recortar espacios ni permitir elegir otra cuenta', async () => {
  const { servicios, peticiones } = crear(() => json({ success: true, message: 'Contraseña actualizada.' }));
  assert.equal(await servicios.cambioClave.cambiarPassword({ ...cambio, idUsuario: 99, idRol: 4, token: 'otro' }), undefined);
  assert.equal(peticiones.length, 1);
  const { url, init } = peticiones[0];
  assert.equal(url, 'http://servidor.test/api/auth/password');
  assert.equal(init.method, 'PATCH');
  assert.deepEqual(JSON.parse(init.body), cambio);
  assert.equal(init.headers.Authorization, 'Bearer jwt-actual');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.cache, 'no-store');
  assert.equal(init.credentials, 'omit');
});

test('cada petición consulta el token actual del proveedor', async () => {
  const entorno = crear(() => json({ success: true, data: [] }));
  await entorno.servicios.solicitudesConsulta.listarSolicitudes();
  entorno.setToken('jwt-renovado');
  await entorno.servicios.solicitudesConsulta.listarSolicitudes();
  assert.deepEqual(entorno.peticiones.map(p => p.init.headers.Authorization), ['Bearer jwt-actual', 'Bearer jwt-renovado']);
});

test('sin token rechaza antes de enviar una petición', async () => {
  const { servicios, peticiones } = crear(() => { throw new Error('No debe llamar'); }, null);
  await falla(() => servicios.cambioClave.cambiarPassword(cambio), 401, false);
  await falla(() => servicios.solicitudesConsulta.listarSolicitudes(), 401, false);
  assert.equal(peticiones.length, 0);
});

for (const estado of ['PENDIENTE', 'APROBADA', 'RECHAZADA']) {
  test(`consulta el estado ${estado} sin recibir un idUsuario elegido por el cliente`, async () => {
    const fila = { ...pendiente, estado };
    const { servicios, peticiones } = crear(() => json({ success: true, data: [fila] }));
    assert.deepEqual(await servicios.solicitudesConsulta.listarSolicitudes(estado), [fila]);
    assert.equal(peticiones[0].url, `http://servidor.test/api/solicitudes-password?estado=${estado}`);
    assert.equal(peticiones[0].init.method, 'GET');
    assert.equal(peticiones[0].init.body, undefined);
  });
}

test('la consulta elimina claves y hashes inesperados de la respuesta', async () => {
  const { servicios } = crear(() => json({ success: true, data: [{ ...pendiente, passwordHash: 'hash', passwordTemporal: temporal }] }));
  assert.deepEqual(await servicios.solicitudesConsulta.listarSolicitudes(), [pendiente]);
});

test('la consulta normaliza a null los metadatos opcionales omitidos por un mock', async () => {
  const { superadminNombre, fechaResolucion, idSuperadminResolutor, notasResolucion, ...fila } = pendiente;
  const { servicios } = crear(() => json({ success: true, data: [fila] }));
  assert.deepEqual(await servicios.solicitudesConsulta.listarSolicitudes(), [pendiente]);
});

for (const [nombre, data] of [
  ['lista ausente', undefined], ['lista que no es arreglo', {}], ['fila vacía', [{}]],
  ['ID falso', [{ ...pendiente, idSolicitud: false }]],
  ['ID repetido', [pendiente, pendiente]],
  ['estado diferente al filtro', [{ ...pendiente, estado: 'APROBADA' }]],
  ['fecha inválida', [{ ...pendiente, fechaSolicitud: 'sin fecha' }]],
  ['resolutor inválido', [{ ...pendiente, idSuperadminResolutor: -1 }]],
]) {
  test(`no simula una lista válida ante ${nombre}`, async () => {
    const { servicios } = crear(() => json({ success: true, data }));
    await falla(() => servicios.solicitudesConsulta.listarSolicitudes(), 200, false);
  });
}

test('un filtro desconocido se rechaza sin HTTP', async () => {
  const { servicios, peticiones } = crear(() => json({ success: true, data: [] }));
  await falla(() => servicios.solicitudesConsulta.listarSolicitudes('TODAS&otra=1'), null, false);
  assert.equal(peticiones.length, 0);
});

test('aprueba con generación automática y devuelve solo la confirmación del ticket solicitado', async () => {
  const { servicios, peticiones } = crear(() => json({ success: true, data: { ...aprobacion, passwordHash: 'hash-extra' } }));
  assert.deepEqual(await servicios.solicitudesGestion.aprobarSolicitud(7, { notas: 'Verificado', idUsuario: 99, passwordProvisional: 'NoEnviar' }), aprobacion);
  assert.deepEqual(JSON.parse(peticiones[0].init.body), { notas: 'Verificado' });
  assert.equal(peticiones[0].url, 'http://servidor.test/api/solicitudes-password/7/aprobar');
});

test('puede aprobar sin notas y no inventa una clave en el cliente', async () => {
  const { servicios, peticiones } = crear(() => json({ success: true, data: aprobacion }));
  assert.deepEqual(await servicios.solicitudesGestion.aprobarSolicitud(7), aprobacion);
  assert.deepEqual(JSON.parse(peticiones[0].init.body), {});
});

test('rechaza con motivo y confirma el mismo ticket, conservando la normalización del backend', async () => {
  const data = { idSolicitud: 7, estado: 'RECHAZADA', motivo: 'No reconocido' };
  const { servicios, peticiones } = crear(() => json({ success: true, data }));
  assert.deepEqual(await servicios.solicitudesGestion.rechazarSolicitud(7, { motivo: '  No reconocido  ', idUsuario: 99 }), data);
  assert.equal(peticiones[0].url, 'http://servidor.test/api/solicitudes-password/7/rechazar');
  assert.deepEqual(JSON.parse(peticiones[0].init.body), { motivo: '  No reconocido  ' });
});

for (const id of [0, -1, 1.5, '7', NaN, Infinity]) {
  test(`no envía mutaciones con ID inválido: ${String(id)}`, async () => {
    const { servicios, peticiones } = crear(() => json({ success: true, data: aprobacion }));
    await falla(() => servicios.solicitudesGestion.aprobarSolicitud(id), null, false);
    await falla(() => servicios.solicitudesGestion.rechazarSolicitud(id, { motivo: 'No reconocido' }), null, false);
    assert.equal(peticiones.length, 0);
  });
}

for (const datos of [
  { ...aprobacion, idSolicitud: 8 }, { ...aprobacion, estado: 'PENDIENTE' },
  { ...aprobacion, passwordTemporal: 'clave-corta' }, { ...aprobacion, passwordTemporal: 'x'.repeat(23) },
  { ...aprobacion, passwordTemporal: undefined },
]) {
  test('una aprobación con datos incompatibles queda incierta y no se repite', async () => {
    const { servicios, peticiones } = crear(() => json({ success: true, data: datos }));
    await falla(() => servicios.solicitudesGestion.aprobarSolicitud(7), 200, true);
    assert.equal(peticiones.length, 1);
  });
}

test('un rechazo de otro ticket o motivo no se presenta como confirmado', async () => {
  for (const data of [
    { idSolicitud: 8, estado: 'RECHAZADA', motivo: 'No reconocido' },
    { idSolicitud: 7, estado: 'RECHAZADA', motivo: 'Otro motivo' },
  ]) {
    const { servicios } = crear(() => json({ success: true, data }));
    await falla(() => servicios.solicitudesGestion.rechazarSolicitud(7, { motivo: 'No reconocido' }), 200, true);
  }
});

for (const status of [400, 401, 403, 404, 409, 429]) {
  test(`conserva el rechazo HTTP ${status} sin declarar resultado incierto`, async () => {
    const { servicios, peticiones } = crear(() => json({ success: false, message: 'Operación rechazada.' }, status));
    await falla(() => servicios.solicitudesGestion.aprobarSolicitud(7), status, false);
    assert.equal(peticiones.length, 1);
  });
}

for (const status of [408, 500, 502, 504]) {
  test(`HTTP ${status} no prueba que el cambio no haya ocurrido y no genera reenvíos`, async () => {
    const { servicios, peticiones } = crear(() => json({ success: false, message: 'Sin confirmación.' }, status));
    await falla(() => servicios.cambioClave.cambiarPassword(cambio), status, true);
    assert.equal(peticiones.length, 1);
  });
}

test('una pérdida de conexión diferencia lectura fallida de escritura incierta sin reintentos', async () => {
  const { servicios, peticiones } = crear(() => { throw new TypeError('Failed to fetch'); });
  await falla(() => servicios.cambioClave.cambiarPassword(cambio), null, true);
  await falla(() => servicios.solicitudesConsulta.listarSolicitudes(), null, false);
  assert.equal(peticiones.length, 2);
});

test('JSON inválido en una escritura exitosa o 5xx deja el resultado incierto', async () => {
  for (const status of [200, 503]) {
    const { servicios } = crear(() => new Response('<html>Error</html>', { status }));
    await falla(() => servicios.cambioClave.cambiarPassword(cambio), status, true);
  }
});

test('un rechazo 403 sigue siendo rechazo aunque su cuerpo no sea JSON', async () => {
  const { servicios } = crear(() => new Response('Forbidden', { status: 403 }));
  await falla(() => servicios.solicitudesGestion.aprobarSolicitud(7), 403, false);
});

for (const body of [{ success: false }, { success: true }, { success: true, message: '' }]) {
  test('no confirma el cambio propio si falta una respuesta válida del backend', async () => {
    const { servicios } = crear(() => json(body));
    await falla(() => servicios.cambioClave.cambiarPassword(cambio), 200, true);
  });
}

test('una respuesta 201 inesperada no se acepta como confirmación de estos endpoints', async () => {
  const { servicios } = crear(() => json({ success: true, message: 'Otro contrato' }, 201));
  await falla(() => servicios.cambioClave.cambiarPassword(cambio), 201, true);
});
