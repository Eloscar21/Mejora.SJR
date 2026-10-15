import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ControlSesion } from '../src/services/ControlSesion.ts';
import { TiempoFueraService } from '../src/services/TiempoFueraService.ts';

function preparar({ token = null, marca = null, ahora = 1000000 } = {}) {
  const datos = { token, marca, ahora, llamadas: 0 };
  const tokens = {
    async guardar(valor) { datos.token = valor; },
    async leer() { return datos.token; },
    async eliminar() { datos.token = null; },
  };
  const salida = {
    async guardar(valor) { datos.marca = valor; },
    async leer() { return datos.marca; },
    async eliminar() { datos.marca = null; },
  };
  const inicio = { async iniciar() { await tokens.guardar('token-login'); } };
  const renovacion = { async renovar() { datos.llamadas++; return 'token-renovado'; } };
  const reloj = () => datos.ahora;
  const control = new ControlSesion(inicio, renovacion, tokens, salida, new TiempoFueraService(salida, reloj), reloj);
  return { control, datos, tokens, salida, inicio, renovacion };
}
const credenciales = { email: 'test@example.com', password: 'solo-pruebas' };
async function iniciar(p) { await p.control.restaurar(); await p.control.iniciar(credenciales); }

test('arranque sin token muestra login', async () => {
  const p = preparar(); await p.control.restaurar();
  assert.equal(p.control.obtenerEstado().fase, 'login');
});

test('login persistido habilita acceso y escribe punto de recuperación', async () => {
  const p = preparar(); await iniciar(p);
  assert.equal(p.control.obtenerEstado().fase, 'activa');
  assert.equal(p.datos.marca, p.datos.ahora);
});

test('restaura solo después de verificar con el servidor y guardar el reemplazo', async () => {
  const p = preparar({ token: 'previo', marca: 900000 });
  await p.control.restaurar();
  assert.equal(p.datos.llamadas, 1);
  assert.equal(p.datos.token, 'token-renovado');
  assert.equal(p.control.obtenerEstado().fase, 'activa');
});

for (const marca of [700000, 699999, null, 1000001]) {
  test(`no restaura fuera del plazo o marca inválida: ${marca}`, async () => {
    const p = preparar({ token: 'previo', marca }); await p.control.restaurar();
    assert.equal(p.datos.token, null);
    assert.equal(p.datos.llamadas, 0);
    assert.equal(p.control.obtenerEstado().fase, 'login');
  });
}

test('cada salida crea intervalo independiente y 5 minutos exactos cierran', async () => {
  const p = preparar(); await iniciar(p);
  await p.control.cambiarActividad(false);
  p.datos.ahora += 240000;
  await p.control.cambiarActividad(true);
  assert.equal(p.control.obtenerEstado().fase, 'activa');
  p.datos.ahora += 600000;
  await p.control.mantenerActiva();
  await p.control.cambiarActividad(false);
  p.datos.ahora += 300000;
  await p.control.cambiarActividad(true);
  assert.equal(p.control.obtenerEstado().fase, 'login');
  assert.equal(p.datos.token, null);
});

test('no renueva en segundo plano y eventos repetidos no prolongan salida', async () => {
  const p = preparar(); await iniciar(p);
  await p.control.cambiarActividad(false);
  const marca = p.datos.marca;
  p.datos.ahora += 240000;
  await p.control.cambiarActividad(false);
  await p.control.mantenerActiva();
  assert.equal(p.datos.marca, marca);
  assert.equal(p.datos.llamadas, 0);
});

test('401 al renovar elimina sesión', async () => {
  const p = preparar({ token: 'vencido', marca: 900000 });
  p.renovacion.renovar = async () => { throw { status: 401 }; };
  await p.control.restaurar();
  assert.equal(p.datos.token, null);
  assert.equal(p.control.obtenerEstado().fase, 'login');
});

for (const status of [undefined, 403, 500]) {
  test(`fallo ${status} bloquea acceso sin borrar ni ampliar plazo`, async () => {
    const p = preparar({ token: 'previo', marca: 900000 });
    p.renovacion.renovar = async () => { throw { status }; };
    await p.control.restaurar();
    assert.equal(p.control.obtenerEstado().fase, 'error');
    await p.control.cambiarActividad(false);
    assert.equal(p.datos.token, 'previo');
    assert.equal(p.datos.marca, 900000);
  });
}

test('no abre sesión si falla el guardado de la renovación', async () => {
  const p = preparar({ token: 'previo', marca: 900000 });
  p.tokens.guardar = async () => { throw new Error('almacenamiento'); };
  await p.control.restaurar();
  assert.equal(p.control.obtenerEstado().fase, 'error');
});

test('cierre borra token y marca y permite otro login', async () => {
  const p = preparar(); await iniciar(p); await p.control.cerrar();
  assert.equal(p.datos.token, null); assert.equal(p.datos.marca, null);
  await p.control.iniciar(credenciales);
  assert.equal(p.control.obtenerEstado().fase, 'activa');
});

test('cierre fallido no se convierte en restauración al reintentar', async () => {
  const p = preparar(); await iniciar(p);
  p.tokens.eliminar = async () => { throw new Error('almacenamiento'); };
  await p.control.cerrar(); await p.control.restaurar();
  assert.equal(p.control.obtenerEstado().fase, 'error');
  assert.equal(p.datos.llamadas, 0);
});

test('renovación tardía no revive una sesión cerrada', async () => {
  const p = preparar(); await iniciar(p);
  let resolver, notificar;
  const empezada = new Promise((r) => { notificar = r; });
  p.renovacion.renovar = () => { notificar(); return new Promise((r) => { resolver = r; }); };
  p.datos.ahora += 60000;
  const renovando = p.control.mantenerActiva();
  await empezada;
  const cerrando = p.control.cerrar();
  resolver('token-tardio');
  await Promise.all([renovando, cerrando]);
  assert.equal(p.datos.token, null);
  assert.equal(p.control.obtenerEstado().fase, 'login');
});

test('salir durante renovación no extiende la hora de salida', async () => {
  const p = preparar(); await iniciar(p);
  let resolver, notificar;
  const empezada = new Promise((r) => { notificar = r; });
  p.renovacion.renovar = () => { notificar(); return new Promise((r) => { resolver = r; }); };
  p.datos.ahora += 60000;
  const renovando = p.control.mantenerActiva(); await empezada;
  const instante = p.datos.ahora;
  const saliendo = p.control.cambiarActividad(false);
  p.datos.ahora += 300000;
  resolver('nuevo');
  await Promise.all([renovando, saliendo]);
  assert.equal(p.datos.marca, instante);
  await p.control.cambiarActividad(true);
  assert.equal(p.control.obtenerEstado().fase, 'login');
});
