import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TiempoFueraService } from '../src/services/TiempoFueraService.ts';
import { SecureSalidaStorage } from '../src/services/storage/SecureSalidaStorage.ts';

function preparar() {
  const datos = new Map();
  let ahora = 1000000;
  const api = {
    async setItemAsync(clave, valor) { datos.set(clave, valor); },
    async getItemAsync(clave) { return datos.get(clave) ?? null; },
    async deleteItemAsync(clave) { datos.delete(clave); },
  };
  const storage = new SecureSalidaStorage(api);
  return {
    api, storage,
    servicio: new TiempoFueraService(storage, () => ahora),
    avanzar(ms) { ahora += ms; },
  };
}

for (const [tiempo, permitido] of [[0, true], [120000, true], [299999, true], [300000, false], [300001, false]]) {
  test(`tras ${tiempo} ms fuera permite regreso por tiempo: ${permitido}`, async () => {
    const p = preparar();
    await p.servicio.registrarSalida();
    p.avanzar(tiempo);
    assert.equal(await p.servicio.permiteRegresoPorTiempo(), permitido);
  });
}

test('sin registro de salida no asume una sesión recuperable', async () => {
  assert.equal(await preparar().servicio.permiteRegresoPorTiempo(), false);
});

test('una segunda notificación de salida no prolonga el intervalo', async () => {
  const p = preparar();
  await p.servicio.registrarSalida();
  p.avanzar(200000);
  await p.servicio.registrarSalida();
  p.avanzar(100000);
  assert.equal(await p.servicio.permiteRegresoPorTiempo(), false);
});

test('un reloj atrasado no autoriza el regreso', async () => {
  const p = preparar();
  await p.servicio.registrarSalida();
  p.avanzar(-1);
  assert.equal(await p.servicio.permiteRegresoPorTiempo(), false);
});

test('tras limpiar el intervalo anterior, la siguiente salida inicia otro', async () => {
  const p = preparar();
  await p.servicio.registrarSalida();
  p.avanzar(120000);
  assert.equal(await p.servicio.permiteRegresoPorTiempo(), true);
  await p.servicio.limpiarSalida();
  p.avanzar(900000); // El tiempo de uso continuo no cuenta como tiempo fuera.
  await p.servicio.registrarSalida();
  p.avanzar(1000);
  assert.equal(await p.servicio.permiteRegresoPorTiempo(), true);
});

test('otra instancia puede leer la hora guardada, sin temporizador en memoria', async () => {
  const p = preparar();
  await p.servicio.registrarSalida();
  const nuevo = new TiempoFueraService(new SecureSalidaStorage(p.api), () => 1300000);
  assert.equal(await nuevo.permiteRegresoPorTiempo(), false);
});

test('datos corruptos provocan error, nunca autorización', async () => {
  const p = preparar();
  for (const contenido of ['', 'null', '"123"', '-1', '{}', '1.5']) {
    p.api.getItemAsync = async () => contenido;
    await assert.rejects(p.servicio.permiteRegresoPorTiempo());
  }
});

test('errores de lectura, escritura y limpieza se propagan', async () => {
  for (const [operacion, metodo] of [
    ['permiteRegresoPorTiempo', 'getItemAsync'],
    ['registrarSalida', 'setItemAsync'],
    ['limpiarSalida', 'deleteItemAsync'],
  ]) {
    const p = preparar();
    const fallo = new Error('Fallo simulado');
    p.api[metodo] = async () => { throw fallo; };
    await assert.rejects(p.servicio[operacion](), (error) => error === fallo);
  }
});
