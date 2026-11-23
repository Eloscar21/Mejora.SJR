'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const SqlCatalogoRepository = require('../../mejora-sjr-backend/src/repositories/SqlCatalogoRepository');
const MockCatalogoRepository = require('../../mejora-sjr-backend/src/repositories/MockCatalogoRepository');
const CatalogoService = require('../../mejora-sjr-backend/src/services/CatalogoService');

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

test('US-035 (1): SqlCatalogoRepository ejecuta consultas e inserciones parametrizadas sobre Azure SQL', async () => {
  const queries = [];
  const fakePool = {
    request() {
      const inputs = {};
      return {
        input(name, _type, value) {
          inputs[name] = value;
          return this;
        },
        async query(sqlText) {
          queries.push({ sqlText, inputs });
          if (sqlText.includes('INSERT INTO Categorias')) {
            return {
              recordset: [
                {
                  idCategoria: 5,
                  nombre: inputs.Nombre,
                  idDepartamento: inputs.IdDepartamento,
                  departamentoNombre: inputs.IdDepartamento === 1 ? 'JAPAM' : 'Servicios Públicos',
                },
              ],
            };
          }
          if (sqlText.includes('FROM Departamentos')) {
            return {
              recordset: [
                { idDepartamento: 1, nombre: 'JAPAM' },
                { idDepartamento: 2, nombre: 'Servicios Públicos' },
              ],
            };
          }
          return {
            recordset: [
              {
                idCategoria: 1,
                nombre: 'Fugas de agua',
                idDepartamento: 1,
                departamentoNombre: 'JAPAM',
              },
              {
                idCategoria: 5,
                nombre: 'Drenaje pluvial obstruido',
                idDepartamento: 1,
                departamentoNombre: 'JAPAM',
              },
            ],
          };
        },
      };
    },
  };

  const sqlRepo = new SqlCatalogoRepository(fakePool);
  const deptos = await sqlRepo.obtenerDepartamentos();
  assert.equal(deptos.length, 2);

  const creada = await sqlRepo.crearCategoria({
    nombre: 'Drenaje pluvial obstruido',
    idDepartamento: 1,
  });
  assert.deepEqual(creada, {
    idCategoria: 5,
    nombre: 'Drenaje pluvial obstruido',
    idDepartamento: 1,
    departamentoNombre: 'JAPAM',
  });

  const categorias = await sqlRepo.obtenerCategorias(1);
  assert.equal(categorias.length, 2);
  assert.equal(categorias[1].nombre, 'Drenaje pluvial obstruido');
});

test('US-035 (2, 3 y 4): Propagación E2E desde Web Admin (POST /api/catalogos/categorias) hacia App Móvil (ReporteFormView)', async () => {
  const backendRepo = new MockCatalogoRepository();
  const backendService = new CatalogoService(backendRepo);

  // Validación RBAC: Admin JAPAM (Rol 3, Depto 1) no puede crear categoría en Servicios Públicos (Depto 2)
  await assert.rejects(
    backendService.crearCategoria(
      { nombre: 'Semáforos peatonales', idDepartamento: 2 },
      { idUsuario: 3, idRol: 3, idDepartamento: 1 }
    ),
    (err) => err.statusCode === 403
  );

  // Mock de fetch compartido que conecta Web Admin y Mobile con el CatalogoService del Backend
  const fetchCompartido = async (url, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'POST' && url.endsWith('/catalogos/categorias')) {
      const body = JSON.parse(options.body);
      const creada = await backendService.crearCategoria(body, {
        idUsuario: 4,
        idRol: 4,
        idDepartamento: null,
      });
      return new Response(JSON.stringify({ success: true, data: creada }), { status: 201 });
    }
    if (method === 'GET' && url.includes('/catalogos/departamentos')) {
      const data = await backendService.listarDepartamentos();
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }
    if (method === 'GET' && url.includes('/catalogos/categorias')) {
      const data = await backendService.listarCategorias();
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false }), { status: 404 });
  };

  // 1. Web Admin crea una nueva categoría ("Limpieza de parques", Depto 2)
  const { CatalogoApiService: AdminCatalogoApiService } = loadSource(
    '../../mejora-sjr-admin/src/services/api/CatalogoApiService.ts'
  );
  const originalFetch = global.fetch;
  global.fetch = fetchCompartido;

  try {
    const adminApi = new AdminCatalogoApiService('http://localhost:5000/api', undefined, {
      obtenerToken: () => 'jwt-superadmin',
    });

    const nuevaCat = await adminApi.crearCategoria({
      nombre: 'Limpieza de parques',
      idDepartamento: 2,
      prioridad: 'Media',
      slaHoras: 48,
      activo: true,
    });

    assert.equal(nuevaCat.idCategoria, 5);
    assert.equal(nuevaCat.nombre, 'Limpieza de parques');
    assert.equal(nuevaCat.departamentoNombre, 'Servicios Públicos');

    // 2. App Móvil consulta en tiempo real las categorías para el formulario ciudadano
    const { CatalogoApiService: MobileCatalogoApiService } = loadSource(
      '../src/services/api/CatalogoApiService.ts',
      {
        './apiConfig': { getApiBaseUrl: () => 'http://localhost:5000/api' },
      }
    );

    const mobileApi = new MobileCatalogoApiService('http://localhost:5000/api', fetchCompartido);
    const categoriasEnMovil = await mobileApi.obtenerCategorias();

    assert.equal(categoriasEnMovil.length, 5);
    const propagada = categoriasEnMovil.find((c) => c.idCategoria === 5);
    assert.deepEqual(propagada, {
      idCategoria: 5,
      nombre: 'Limpieza de parques',
      idDepartamento: 2,
      departamentoNombre: 'Servicios Públicos',
    });
  } finally {
    global.fetch = originalFetch;
  }
});
