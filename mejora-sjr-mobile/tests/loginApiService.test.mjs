import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LoginApiService, LoginApiError } from '../src/services/api/LoginApiService.ts';

const credenciales = { email: 'persona@ejemplo.com', password: ' contraseña ' };

test('envía solo credenciales y canal móvil, y devuelve el resultado validado', async () => {
  const servicio = new LoginApiService('https://api.example.test/', async (url, opciones) => {
    assert.equal(url, 'https://api.example.test/api/auth/login');
    assert.equal(opciones.method, 'POST');
    assert.equal(opciones.headers['Content-Type'], 'application/json');
    assert.equal(opciones.credentials, 'omit');
    assert.deepEqual(JSON.parse(opciones.body), { ...credenciales, canal: 'movil' });
    return Response.json({ mensaje: 'Login exitoso', token: 'token-simulado', extra: 'ignorado' });
  });
  assert.deepEqual(await servicio.login({ ...credenciales, idRol: 4, canal: 'web' }), {
    mensaje: 'Login exitoso', token: 'token-simulado',
  });
});

for (const status of [400, 401, 403]) {
  test(`conserva el estado HTTP ${status} y el mensaje de rechazo`, async () => {
    const servicio = new LoginApiService('https://api.example.test', async () =>
      Response.json({ mensaje: 'Solicitud rechazada' }, { status }));
    await assert.rejects(servicio.login(credenciales), (error) =>
      error instanceof LoginApiError && error.status === status && error.message === 'Solicitud rechazada');
  });
}

test('un fallo de red no se transforma en 401', async () => {
  const servicio = new LoginApiService('https://api.example.test', async () => { throw new TypeError('red'); });
  await assert.rejects(servicio.login(credenciales), (error) =>
    error instanceof LoginApiError && error.status === undefined);
});

for (const payload of [null, [], {}, { mensaje: 'OK' }, { mensaje: 'OK', token: ' ' },
  { mensaje: 'OK', token: 123 }, { mensaje: {}, token: 'token' }]) {
  test(`rechaza un éxito con estructura inválida: ${JSON.stringify(payload)}`, async () => {
    const servicio = new LoginApiService('https://api.example.test', async () => Response.json(payload));
    await assert.rejects(servicio.login(credenciales), (error) =>
      error instanceof LoginApiError && error.status === 200);
  });
}

test('rechaza HTML incluso con estado 200', async () => {
  const servicio = new LoginApiService('https://api.example.test', async () => new Response('<html>Error</html>'));
  await assert.rejects(servicio.login(credenciales), LoginApiError);
});

test('un 500 no expone detalles internos del servidor', async () => {
  const servicio = new LoginApiService('https://api.example.test', async () =>
    Response.json({ mensaje: 'Detalle interno de infraestructura' }, { status: 500 }));
  await assert.rejects(servicio.login(credenciales), (error) =>
    error.status === 500 && !error.message.includes('infraestructura'));
});

test('conserva 503 aunque el cuerpo no sea JSON', async () => {
  const servicio = new LoginApiService('https://api.example.test', async () =>
    new Response('Servicio no disponible', { status: 503 }));
  await assert.rejects(servicio.login(credenciales), (error) => error.status === 503);
});
