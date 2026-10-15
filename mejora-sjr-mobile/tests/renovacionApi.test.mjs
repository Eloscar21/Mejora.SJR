import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RenovacionApiService, RenovacionApiError } from '../src/services/api/RenovacionApiService.ts';

test('renueva con Bearer y devuelve el reemplazo sin cookies', async () => {
  const api = new RenovacionApiService('https://api.example.test/', async (url, opciones) => {
    assert.equal(url, 'https://api.example.test/api/auth/renovar');
    assert.equal(opciones.headers.Authorization, 'Bearer anterior');
    assert.equal(opciones.method, 'POST');
    assert.equal(opciones.credentials, 'omit');
    assert.ok(opciones.signal instanceof AbortSignal);
    return Response.json({ mensaje: 'Sesión renovada', token: 'nuevo' });
  });
  assert.equal(await api.renovar('anterior'), 'nuevo');
});

for (const status of [401, 403, 500]) {
  test(`conserva estado HTTP ${status} incluso sin cuerpo JSON`, async () => {
    const api = new RenovacionApiService('https://api.example.test', async () => new Response('error', { status }));
    await assert.rejects(api.renovar('token'), (error) => error instanceof RenovacionApiError && error.status === status);
  });
}

test('fallo de red no se transforma en expiración', async () => {
  const api = new RenovacionApiService('https://api.example.test', async () => { throw new Error('red'); });
  await assert.rejects(api.renovar('token'), (error) => error instanceof RenovacionApiError && error.status === undefined);
});

for (const body of [null, {}, { token: '' }, { token: 1 }]) {
  test(`rechaza respuesta incompleta ${JSON.stringify(body)}`, async () => {
    const api = new RenovacionApiService('https://api.example.test', async () => Response.json(body));
    await assert.rejects(api.renovar('token'), RenovacionApiError);
  });
}

test('aborta petición detenida al alcanzar el timeout', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const api = new RenovacionApiService('https://api.example.test', async (_, opciones) => {
    signal = opciones.signal;
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('abortado'))));
  });
  const resultado = assert.rejects(api.renovar('token'), RenovacionApiError);
  t.mock.timers.tick(10000);
  await resultado;
  assert.equal(signal.aborted, true);
});
