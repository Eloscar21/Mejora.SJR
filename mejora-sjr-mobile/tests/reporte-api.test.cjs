'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

function loadSource(relativePath, dependencies = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = name => Object.hasOwn(dependencies, name) ? dependencies[name] : originalRequire(name);
  loaded._compile(outputText, filename);
  return loaded.exports;
}

const { ReporteApiError } = loadSource('../src/services/api/ReporteApiError.ts');
const { ReporteApiService } = loadSource('../src/services/api/ReporteApiService.ts', {
  './ReporteApiError': { ReporteApiError },
  './apiConfig': { getApiBaseUrl: () => 'http://servidor-prueba.local/api' },
});

const fotoUrl = 'https://ejemplo.test/evidencia/bache.jpg';
const fecha = '2026-11-11T12:00:00.000Z';
const solicitud = { descripcion: 'Bache profundo frente al parque', idCategoria: 4, latitud: 20.3889, longitud: -99.9961, fotoUrl };
const sesion = { async obtenerToken() { return 'token-de-prueba'; } };
function reporte() {
  return {
    idIncidencia: 42,
    descripcion: solicitud.descripcion,
    idCategoria: solicitud.idCategoria,
    latitud: solicitud.latitud,
    longitud: solicitud.longitud,
    idUsuario: 1,
    idEstado: 1,
    fechaCreacion: fecha,
    fechaActualizacion: fecha,
    idTrabajadorAsignado: null,
    evidencias: [{ idEvidencia: 7, idIncidencia: 42, tipoEvidencia: 'INICIAL', fotoUrl, fechaSubida: fecha }],
  };
}
function respuesta(data = reporte(), status = 201, success = true) {
  return new Response(JSON.stringify({ success, data }), { status, headers: { 'Content-Type': 'application/json' } });
}

test('POST envía exclusivamente el contrato de US-023, con JWT y confirmación del ID real', async () => {
  const calls = [];
  const service = new ReporteApiService(sesion, 'http://localhost:5000/api///', async (url, options) => {
    calls.push({ url, options });
    return respuesta({ ...reporte(), passwordHash: 'campo-ajeno', token: 'campo-ajeno' });
  });
  const result = await service.crearReporte({ ...solicitud, idUsuario: 99, idDepartamento: 99, direccionReferencia: 'campo-ajeno', fotoUri: 'file:///imagen.jpg' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://localhost:5000/api/incidencias');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-de-prueba');
  assert.deepEqual(JSON.parse(calls[0].options.body), solicitud);
  assert.equal(result.idIncidencia, 42);
  assert.equal(result.idUsuario, 1);
  assert.equal(result.idEstado, 1);
  assert.equal(result.evidencias[0].fotoUrl, fotoUrl);
  assert.equal(result.passwordHash, undefined);
  assert.equal(result.token, undefined);
});

test('el contrato admite creación sin fotografía cuando no se envía fotoUrl', async () => {
  const { fotoUrl: omitida, ...sinFoto } = solicitud;
  const service = new ReporteApiService(sesion, undefined, async (url, options) => {
    assert.equal(url, 'http://servidor-prueba.local/api/incidencias');
    assert.deepEqual(JSON.parse(options.body), sinFoto);
    return respuesta({ ...reporte(), evidencias: [] });
  });
  assert.deepEqual((await service.crearReporte(sinFoto)).evidencias, []);
});

test('consulta el token actual en cada envío en lugar de conservar una credencial anterior', async () => {
  let token = 'token-anterior';
  const recibidos = [];
  const service = new ReporteApiService({ async obtenerToken() { return token; } }, undefined, async (_url, options) => {
    recibidos.push(options.headers.Authorization);
    return respuesta();
  });
  await service.crearReporte(solicitud);
  token = 'token-actual';
  await service.crearReporte(solicitud);
  assert.deepEqual(recibidos, ['Bearer token-anterior', 'Bearer token-actual']);
});

test('sin token no inicia ninguna petición ni declara un resultado de escritura desconocido', async () => {
  let calls = 0;
  const service = new ReporteApiService({ async obtenerToken() { return null; } }, undefined, async () => { calls++; return respuesta(); });
  await assert.rejects(service.crearReporte(solicitud), error => error instanceof ReporteApiError && error.status === 401 && !error.resultadoDesconocido);
  assert.equal(calls, 0);
});

test('si falla la lectura de sesión no envía HTTP ni oculta el error de almacenamiento', async () => {
  let calls = 0;
  const fallo = new Error('No se pudo leer la sesión');
  const service = new ReporteApiService({ async obtenerToken() { throw fallo; } }, undefined, async () => { calls++; return respuesta(); });
  await assert.rejects(service.crearReporte(solicitud), error => error === fallo);
  assert.equal(calls, 0);
});

for (const status of [400, 401, 403, 408, 500]) {
  test(`conserva HTTP ${status} y el mensaje del servidor sin repetir el POST`, async () => {
    let calls = 0;
    const service = new ReporteApiService(sesion, undefined, async () => {
      calls++;
      return new Response(JSON.stringify({ success: false, message: 'Solicitud rechazada por el servidor' }), { status });
    });
    await assert.rejects(service.crearReporte(solicitud), error => {
      assert.ok(error instanceof ReporteApiError);
      assert.equal(error.status, status);
      assert.equal(error.message, 'Solicitud rechazada por el servidor');
      assert.equal(error.resultadoDesconocido, status >= 500 || status === 408);
      return true;
    });
    assert.equal(calls, 1);
  });
}

test('un fallo de red no produce un ID ni activa reintentos o almacenamiento mock', async () => {
  let calls = 0;
  const service = new ReporteApiService(sesion, undefined, async () => { calls++; throw new TypeError('Failed to fetch'); });
  await assert.rejects(service.crearReporte(solicitud), error => error instanceof ReporteApiError && error.status === null && error.resultadoDesconocido);
  assert.equal(calls, 1);
});

for (const status of [201, 401, 500]) {
  test(`una respuesta HTTP ${status} que no es JSON conserva el estado y evita una confirmación falsa`, async () => {
    const service = new ReporteApiService(sesion, undefined, async () => new Response('<html>Error</html>', { status }));
    await assert.rejects(service.crearReporte(solicitud), error => error instanceof ReporteApiError && error.status === status && error.resultadoDesconocido === (status !== 401));
  });
}

for (const [caso, data] of [
  ['ID inválido', { ...reporte(), idIncidencia: 0 }],
  ['categoría distinta', { ...reporte(), idCategoria: 3 }],
  ['estado inicial incorrecto', { ...reporte(), idEstado: 2 }],
  ['fecha inválida', { ...reporte(), fechaCreacion: 'fecha-desconocida' }],
  ['coordenada inválida', { ...reporte(), latitud: null }],
  ['evidencia ausente', { ...reporte(), evidencias: [] }],
  ['evidencia de otro reporte', { ...reporte(), evidencias: [{ ...reporte().evidencias[0], idIncidencia: 99 }] }],
  ['evidencia local sin URL HTTP', { ...reporte(), evidencias: [{ ...reporte().evidencias[0], fotoUrl: 'file:///foto.jpg' }] }],
]) {
  test(`rechaza una confirmación con ${caso} y marca el resultado como no confirmado`, async () => {
    const service = new ReporteApiService(sesion, undefined, async () => respuesta(data));
    await assert.rejects(service.crearReporte(solicitud), error => error instanceof ReporteApiError && error.status === 201 && error.resultadoDesconocido);
  });
}

for (const [status, success] of [[200, true], [201, false]]) {
  test(`HTTP ${status} con success=${success} no satisface la confirmación acordada`, async () => {
    const service = new ReporteApiService(sesion, undefined, async () => respuesta(reporte(), status, success));
    await assert.rejects(service.crearReporte(solicitud), error => error instanceof ReporteApiError && error.resultadoDesconocido);
  });
}
