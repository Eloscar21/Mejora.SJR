'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const { afterEach, beforeEach, describe, it, mock } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Compila el middleware real en memoria; NextRequest/NextResponse no se sustituyen.
const middlewarePath = path.resolve(__dirname, '../src/middleware.ts');
const compiled = ts.transpileModule(readFileSync(middlewarePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: middlewarePath
});
const middlewareModule = new Module(middlewarePath, module);
middlewareModule.filename = middlewarePath;
middlewareModule.paths = Module._nodeModulePaths(path.dirname(middlewarePath));
middlewareModule._compile(compiled.outputText, middlewarePath);
const { middleware } = middlewareModule.exports;

const cookieName = 'mejora_sjr_token';

// Este middleware decodifica claims; estas pruebas no verifican criptografía JWT.
// La verificación de firma de la API se prueba en la suite del backend.
function tokenPara(idRol, overrides = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    idUsuario: idRol === 4 ? 4 : 6,
    email: 'middleware@test.com',
    idRol,
    idDepartamento: idRol === 3 ? 1 : null,
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides
  })).toString('base64url');
  return `${header}.${payload}.firma-de-prueba`;
}

function solicitar(ruta, token, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  if (token !== null) headers.set('cookie', `${cookieName}=${token}`);
  return middleware(new NextRequest(`http://localhost:3000${ruta}`, { headers }));
}

describe('US-021: acceso de consulta a personal en el middleware Next.js', () => {
  beforeEach(() => mock.method(console, 'warn', () => {}));
  afterEach(() => mock.restoreAll());

  for (const [rol, ruta] of [
    [3, '/admin/personal'],
    [3, '/admin/personal/'],
    [3, '/admin/personal?filtro=nombre'],
    [3, '/dashboard'],
    [3, '/admin/acceso-denegado'],
    [4, '/admin/personal'],
    [4, '/admin/configuracion'],
    [4, '/admin/personal/nuevo']
  ]) {
    it(`permite a rol ${rol} continuar hacia ${ruta}`, () => {
      const response = solicitar(ruta, tokenPara(rol));

      assert.equal(response.headers.get('x-middleware-next'), '1');
      assert.equal(response.headers.get('location'), null);
    });
  }

  for (const ruta of [
    '/admin',
    '/admin/configuracion',
    '/admin/personal/nuevo',
    '/admin/personales',
    '/admin/personal-privado'
  ]) {
    it(`conserva la restricción de Superadmin para rol 3 en ${ruta}`, () => {
      const response = solicitar(ruta, tokenPara(3));
      const destino = new URL(response.headers.get('location'));

      assert.equal(response.status, 307);
      assert.equal(response.headers.get('x-middleware-next'), null);
      assert.equal(destino.pathname, '/admin/acceso-denegado');
      assert.equal(destino.searchParams.get('origen'), ruta);
      assert.equal(destino.searchParams.get('motivo'), 'privilegios_superadmin');
    });
  }

  for (const rol of [1, 2, 99]) {
    it(`no permite al rol ${rol} entrar a /admin/personal`, () => {
      const response = solicitar('/admin/personal', tokenPara(rol));

      assert.equal(response.status, 307);
      assert.equal(response.headers.get('x-middleware-next'), null);
    });
  }

  for (const [caso, token, motivo] of [
    ['sin token', null, 'sesion_requerida'],
    ['token ilegible', 'token_invalido', 'token_invalido'],
    ['token expirado', tokenPara(3, { exp: Math.floor(Date.now() / 1000) - 60 }), 'sesion_expirada']
  ]) {
    it(`redirige ${caso} hacia la pantalla de sesión no autorizada`, () => {
      const response = solicitar('/admin/personal', token);
      const destino = new URL(response.headers.get('location'));

      assert.equal(response.status, 307);
      assert.equal(response.headers.get('x-middleware-next'), null);
      assert.equal(destino.pathname, '/no-autorizado');
      assert.equal(destino.searchParams.get('motivo'), motivo);
      assert.equal(destino.searchParams.get('origen'), '/admin/personal');
    });
  }

  it('conserva el rol y departamento de los claims al sobrescribir headers recibidos del cliente', () => {
    const response = solicitar('/admin/personal', tokenPara(3), {
      'x-user-id': '4',
      'x-user-role': '4',
      'x-user-dept': '2'
    });

    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('x-middleware-request-x-user-id'), '6');
    assert.equal(response.headers.get('x-middleware-request-x-user-role'), '3');
    assert.equal(response.headers.get('x-middleware-request-x-user-dept'), '1');
  });

  it('conserva la redirección al dashboard de un rol 3 vigente que abre login', () => {
    const response = solicitar('/login', tokenPara(3));

    assert.equal(response.status, 307);
    assert.equal(new URL(response.headers.get('location')).pathname, '/dashboard');
  });

  it('no intercepta el contenido público al ejecutar la función fuera de rutas protegidas', () => {
    const response = solicitar('/no-autorizado', null);

    assert.equal(response.headers.get('x-middleware-next'), '1');
  });
});
