import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SecureTokenStorage } from '../src/services/storage/SecureTokenStorage.ts';

function crearAlmacen() {
  const datos = new Map();
  const api = {
    async setItemAsync(clave, valor) { datos.set(clave, valor); },
    async getItemAsync(clave) { return datos.get(clave) ?? null; },
    async deleteItemAsync(clave) { datos.delete(clave); },
  };
  return { api, storage: new SecureTokenStorage(api) };
}

test('sin sesión guardada devuelve null', async () => {
  assert.equal(await crearAlmacen().storage.leer(), null);
});

test('guarda, reemplaza y elimina usando la misma clave', async () => {
  const { storage } = crearAlmacen();
  await storage.guardar('token-simulado-1');
  assert.equal(await storage.leer(), 'token-simulado-1');
  await storage.guardar('token-simulado-2');
  assert.equal(await storage.leer(), 'token-simulado-2');
  await storage.eliminar();
  await storage.eliminar();
  assert.equal(await storage.leer(), null);
});

test('no reemplaza el token existente por una entrada vacía o inválida', async () => {
  const { storage } = crearAlmacen();
  await storage.guardar('token-previo');
  for (const valor of ['', '   ', null, 123]) {
    await assert.rejects(storage.guardar(valor));
  }
  assert.equal(await storage.leer(), 'token-previo');
});

test('dato almacenado vacío se rechaza, no se restaura como sesión', async () => {
  const { api } = crearAlmacen();
  api.getItemAsync = async () => ' ';
  await assert.rejects(new SecureTokenStorage(api).leer());
});

for (const [metodo, nativo, args] of [
  ['guardar', 'setItemAsync', ['token-simulado']],
  ['leer', 'getItemAsync', []],
  ['eliminar', 'deleteItemAsync', []],
]) {
  test(`propaga fallo nativo al ${metodo} sin fingir éxito`, async () => {
    const { api } = crearAlmacen();
    const fallo = new Error('Fallo simulado de almacenamiento');
    api[nativo] = async () => { throw fallo; };
    await assert.rejects(new SecureTokenStorage(api)[metodo](...args), (error) => error === fallo);
  });
}
