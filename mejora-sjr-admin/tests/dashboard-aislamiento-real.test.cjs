'use strict';

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { describe, it } = require('node:test');
const ts = require('typescript');

function loadSource(relativePath, dependencies = {}) {
  const filename = path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const originalRequire = loaded.require.bind(loaded);
  loaded.require = (name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), name);
      for (const ext of ['.ts', '.tsx']) {
        if (existsSync(base + ext)) {
          return loadSource(base + ext, dependencies);
        }
      }
    }
    return originalRequire(name);
  };
  loaded._compile(outputText, filename);
  return loaded.exports;
}

describe('Dashboard Ejecutivo: Eliminación de Mocks y Aislamiento Departamental', () => {
  const { DashboardApiService } = loadSource('src/services/api/DashboardApiService.ts');

  const incidenciasRealesPrueba = [
    {
      idIncidencia: 6,
      descripcion: 'se rompio una tuberia, que proboca mucha agua desperdiciada',
      idCategoria: 1,
      categoriaNombre: 'Fugas de agua',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
      idEstado: 1,
      estadoNombre: 'Recibido',
      trabajadorNombre: null,
      fechaCreacion: '2026-11-21T07:25:26.693Z',
      fechaActualizacion: '2026-11-21T07:25:26.693Z',
    },
    {
      idIncidencia: 5,
      descripcion: 'esta fallando una lampara',
      idCategoria: 3,
      categoriaNombre: 'Alumbrado',
      idDepartamento: 2,
      departamentoNombre: 'Servicios Públicos',
      idEstado: 2,
      estadoNombre: 'En Revisión',
      trabajadorNombre: 'Luis Angel',
      fechaCreacion: '2026-11-21T07:24:42.813Z',
      fechaActualizacion: '2026-11-21T07:29:11.583Z',
    },
    {
      idIncidencia: 4,
      descripcion: 'hay un muchos baches',
      idCategoria: 4,
      categoriaNombre: 'Bacheo',
      idDepartamento: 2,
      departamentoNombre: 'Servicios Públicos',
      idEstado: 1,
      estadoNombre: 'Recibido',
      trabajadorNombre: null,
      fechaCreacion: '2026-11-19T22:19:26.233Z',
      fechaActualizacion: '2026-11-19T22:19:26.233Z',
    },
    {
      idIncidencia: 3,
      descripcion: 'Fuga de agua ya se inundó mi casa',
      idCategoria: 1,
      categoriaNombre: 'Fugas de agua',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
      idEstado: 2,
      estadoNombre: 'En Revisión',
      trabajadorNombre: 'Sergio Antonio',
      fechaCreacion: '2026-11-12T22:27:37.530Z',
      fechaActualizacion: '2026-11-19T22:05:23.287Z',
    },
    {
      idIncidencia: 2,
      descripcion: 'Hay un cráter de un meteorito en mi colonia',
      idCategoria: 4,
      categoriaNombre: 'Bacheo',
      idDepartamento: 2,
      departamentoNombre: 'Servicios Públicos',
      idEstado: 2,
      estadoNombre: 'En Revisión',
      trabajadorNombre: 'Oscar',
      fechaCreacion: '2026-11-12T22:10:04.040Z',
      fechaActualizacion: '2026-11-19T22:05:20.830Z',
    },
    {
      idIncidencia: 1,
      descripcion: 'esta rota una tuberia, que proboca que se desperdicie mucha agua',
      idCategoria: 1,
      categoriaNombre: 'Fugas de agua',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
      idEstado: 1,
      estadoNombre: 'Recibido',
      trabajadorNombre: null,
      fechaCreacion: '2026-11-12T21:40:40.690Z',
      fechaActualizacion: '2026-11-12T21:40:40.690Z',
    },
    {
      idIncidencia: 99,
      descripcion: 'reporte descartado de broma',
      idCategoria: 1,
      categoriaNombre: 'Fugas de agua',
      idDepartamento: 1,
      departamentoNombre: 'JAPAM',
      idEstado: 5, // Descartado / Rechazado
      estadoNombre: 'Rechazado',
      trabajadorNombre: null,
      fechaCreacion: '2026-11-10T10:00:00.000Z',
      fechaActualizacion: '2026-11-10T10:05:00.000Z',
    },
  ];

  const categoriasOficialesPrueba = [
    { idCategoria: 1, nombre: 'Fugas de agua', idDepartamento: 1, departamentoNombre: 'JAPAM' },
    { idCategoria: 2, nombre: 'Alcantarillado', idDepartamento: 1, departamentoNombre: 'JAPAM' },
    { idCategoria: 3, nombre: 'Alumbrado', idDepartamento: 2, departamentoNombre: 'Servicios Públicos' },
    { idCategoria: 4, nombre: 'Bacheo', idDepartamento: 2, departamentoNombre: 'Servicios Públicos' },
  ];

  function createFetchMock(llamadasRegistradas) {
    return async (url, options) => {
      llamadasRegistradas.push({ url, options });

      if (url.includes('/catalogos/categorias')) {
        let items = categoriasOficialesPrueba;
        if (url.includes('idDepartamento=1')) {
          items = items.filter((c) => c.idDepartamento === 1);
        } else if (url.includes('idDepartamento=2')) {
          items = items.filter((c) => c.idDepartamento === 2);
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: items }),
        };
      }

      if (url.includes('/incidencias')) {
        let items = incidenciasRealesPrueba;
        if (url.includes('idDepartamento=1')) {
          items = items.filter((i) => i.idDepartamento === 1);
        } else if (url.includes('idDepartamento=2')) {
          items = items.filter((i) => i.idDepartamento === 2);
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: items }),
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ success: false, message: 'Not found' }),
      };
    };
  }

  it('Superadmin: consulta todas las dependencias y elimina reportes ficticios', async () => {
    const llamadas = [];
    global.fetch = createFetchMock(llamadas);

    const mockAuthService = {
      obtenerToken: () => 'token-superadmin-rol4',
    };

    const service = new DashboardApiService(mockAuthService, 'http://localhost:5000/api');
    const resumen = await service.obtenerResumenEjecutivo(null);

    // 1. Debe haber consultado incidencias con el token en el header Authorization
    const llamadaInc = llamadas.find((ll) => ll.url === 'http://localhost:5000/api/incidencias');
    assert.ok(llamadaInc, 'Debe llamar a /api/incidencias sin parámetro idDepartamento para Superadmin');
    assert.equal(llamadaInc.options.headers.Authorization, 'Bearer token-superadmin-rol4');

    // 2. No debe contener folios ficticios como SJR-2026-1048
    const tieneFoliosMock = resumen.reportesRecientes.some((r) => r.folio === 'SJR-2026-1048');
    assert.equal(tieneFoliosMock, false, 'No deben aparecer reportes ficticios en el dashboard');

    // 3. Debe excluir reportes rechazados/descartados (idEstado: 5)
    const tieneDescartado = resumen.reportesRecientes.some((r) => r.idIncidencia === 99);
    assert.equal(tieneDescartado, false, 'No debe mostrar reportes descartados/rechazados');

    // 4. Debe contar los 6 reportes activos reales (3 nuevos, 3 en proceso, 0 resueltos)
    assert.equal(resumen.kpis.totalReportes, 6);
    assert.equal(resumen.kpis.nuevosReportes, 3);
    assert.equal(resumen.kpis.enProceso, 3);
    assert.equal(resumen.kpis.resueltos, 0);

    // 5. Los reportes deben estar ordenados por id descendente (folio SJR-2026-0006 primero)
    assert.equal(resumen.reportesRecientes[0].folio, 'SJR-2026-0006');
    assert.equal(resumen.reportesRecientes[0].categoria, 'Fugas de agua');
    assert.equal(resumen.reportesRecientes[0].departamento, 'JAPAM');

    // 6. El desglose por categoría debe incluir tanto JAPAM como Servicios Públicos
    assert.equal(resumen.porCategoria.length, 4);
    const catFugas = resumen.porCategoria.find((c) => c.nombre === 'Fugas de agua');
    assert.equal(catFugas.total, 3); // id 6, 3, 1
    assert.equal(catFugas.nuevos, 2); // id 6, 1
    assert.equal(catFugas.enProceso, 1); // id 3
  });

  it('Admin JAPAM: Aislamiento departamental estricto (solo ve JAPAM)', async () => {
    const llamadas = [];
    global.fetch = createFetchMock(llamadas);

    const mockAuthService = {
      obtenerToken: () => 'token-admin-japam-rol3',
    };

    const service = new DashboardApiService(mockAuthService, 'http://localhost:5000/api');
    const resumen = await service.obtenerResumenEjecutivo(1); // Depto 1 = JAPAM

    // 1. Debe haber consultado con query param ?idDepartamento=1
    const llamadaInc = llamadas.find((ll) => ll.url.includes('idDepartamento=1'));
    assert.ok(llamadaInc, 'Debe llamar con ?idDepartamento=1');

    // 2. Solo debe incluir reportes de JAPAM (idDepartamento 1)
    for (const rep of resumen.reportesRecientes) {
      assert.equal(rep.idDepartamento, 1, 'Ningún reporte de otra dependencia debe filtrarse');
      assert.equal(rep.departamento, 'JAPAM');
    }

    // 3. JAPAM tiene 3 reportes activos (id 6, 3, 1): 2 nuevos, 1 en proceso, 0 resueltos
    assert.equal(resumen.kpis.totalReportes, 3);
    assert.equal(resumen.kpis.nuevosReportes, 2);
    assert.equal(resumen.kpis.enProceso, 1);
    assert.equal(resumen.kpis.resueltos, 0);

    // 4. Las categorías aplicables deben ser exclusivamente las de JAPAM (Fugas y Alcantarillado)
    for (const cat of resumen.porCategoria) {
      assert.equal(cat.idDepartamento, 1, 'Solo categorías de JAPAM');
      assert.equal(cat.departamento, 'JAPAM');
    }
    assert.equal(resumen.porCategoria.length, 2);
  });

  it('Admin Servicios Públicos: Aislamiento departamental estricto (solo ve Servicios Públicos)', async () => {
    const llamadas = [];
    global.fetch = createFetchMock(llamadas);

    const mockAuthService = {
      obtenerToken: () => 'token-admin-servicios-rol3',
    };

    const service = new DashboardApiService(mockAuthService, 'http://localhost:5000/api');
    const resumen = await service.obtenerResumenEjecutivo(2); // Depto 2 = Servicios Públicos

    // 1. Solo debe incluir reportes de Servicios Públicos
    for (const rep of resumen.reportesRecientes) {
      assert.equal(rep.idDepartamento, 2, 'Ningún reporte de JAPAM debe filtrarse');
      assert.equal(rep.departamento, 'Servicios Públicos');
    }

    // 2. Servicios Públicos tiene 3 reportes activos (id 5, 4, 2): 1 nuevo, 2 en proceso
    assert.equal(resumen.kpis.totalReportes, 3);
    assert.equal(resumen.kpis.nuevosReportes, 1);
    assert.equal(resumen.kpis.enProceso, 2);
    assert.equal(resumen.kpis.resueltos, 0);

    // 3. Categorías exclusivas de Servicios Públicos (Alumbrado y Bacheo)
    for (const cat of resumen.porCategoria) {
      assert.equal(cat.idDepartamento, 2, 'Solo categorías de Servicios Públicos');
      assert.equal(cat.departamento, 'Servicios Públicos');
    }
    assert.equal(resumen.porCategoria.length, 2);
  });
});
