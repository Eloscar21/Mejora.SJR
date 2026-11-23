const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(relativePath, dependencies = {}) {
  const filename = path.join(__dirname, relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, Error, Promise, Array, Number, String, Date, isNaN,
    fetch: typeof fetch !== 'undefined' ? fetch : (() => {}),
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Dependencia inesperada: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

const { BandejaConsultaApiService } = loadSource('../src/services/api/BandejaConsultaApiService.ts', {
  './apiConfig': { getApiBaseUrl: () => 'http://localhost:4000/api' },
});

test('BandejaConsultaApiService valida idTrabajador correctamente', async () => {
  const service = new BandejaConsultaApiService({ obtenerToken: async () => 'test-token' });
  await assert.rejects(service.listarAsignadas(0), /identificador de trabajador válido/);
  await assert.rejects(service.listarAsignadas(-1), /identificador de trabajador válido/);
  await assert.rejects(service.listarAsignadas(NaN), /identificador de trabajador válido/);
});

test('BandejaConsultaApiService requiere token de autenticación', async () => {
  const service = new BandejaConsultaApiService({ obtenerToken: async () => null });
  await assert.rejects(service.listarAsignadas(17), /Inicia sesión/);
});

test('BandejaConsultaApiService consulta GET /incidencias?soloAsignadasAMi=true con header Bearer', async () => {
  let urlLlamada = '';
  let headersLlamada = {};

  const mockFetch = async (url, options) => {
    urlLlamada = url;
    headersLlamada = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [
          {
            idIncidencia: 5,
            descripcion: 'esta fallando una lampara',
            latitud: 20.3889,
            longitud: -99.9961,
            idCategoria: 3,
            categoriaNombre: 'Alumbrado',
            idDepartamento: 2,
            departamentoNombre: 'Servicios Públicos Municipales',
            idEstado: 3,
            estadoNombre: 'En Progreso',
            idCiudadano: 1,
            ciudadanoNombre: 'Isaac Ciudadano',
            idTrabajadorAsignado: 17,
            trabajadorNombre: 'Luis Angel',
            fechaCreacion: '2026-11-20T10:00:00.000Z',
          },
        ],
      }),
    };
  };

  const service = new BandejaConsultaApiService(
    { obtenerToken: async () => 'jwt-valido-luis-angel' },
    'http://localhost:4000/api',
    mockFetch
  );

  const resultado = await service.listarAsignadas(17);

  assert.equal(urlLlamada, 'http://localhost:4000/api/incidencias?soloAsignadasAMi=true');
  assert.equal(headersLlamada['Authorization'], 'Bearer jwt-valido-luis-angel');
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].idIncidencia, 5);
  assert.equal(resultado[0].idTrabajadorAsignado, 17);
  assert.equal(resultado[0].trabajadorNombre, 'Luis Angel');
  assert.equal(resultado[0].categoriaNombre, 'Alumbrado');
  assert.equal(resultado[0].idEstado, 3);
});

test('BandejaConsultaApiService maneja error HTTP del servidor', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ message: 'Acceso denegado' }),
  });

  const service = new BandejaConsultaApiService(
    { obtenerToken: async () => 'token' },
    'http://localhost:4000/api',
    mockFetch
  );

  await assert.rejects(service.listarAsignadas(17), /Error 403/);
});

test('BandejaConsultaApiService lanza error cuando la red falla', async () => {
  const mockFetch = async () => {
    throw new Error('Network request failed');
  };

  const service = new BandejaConsultaApiService(
    { obtenerToken: async () => 'token' },
    'http://localhost:4000/api',
    mockFetch
  );

  await assert.rejects(service.listarAsignadas(17), /servidor municipal/);
});
