import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InicioSesionService } from '../src/services/InicioSesionService.ts';

const credenciales = { email: 'persona@ejemplo.com', password: 'clave-de-prueba' };
const login = { async login() { return { mensaje: 'OK', token: 'token-simulado' }; } };

test('no completa el inicio hasta que termina el guardado', async () => {
  let completarGuardado;
  let notificarGuardado;
  const empezoGuardado = new Promise((resolve) => { notificarGuardado = resolve; });
  const guardado = new Promise((resolve) => { completarGuardado = resolve; });
  let terminado = false;
  const servicio = new InicioSesionService(login, {
    async guardar(token) {
      assert.equal(token, 'token-simulado');
      notificarGuardado();
      await guardado;
    },
  });
  const resultado = servicio.iniciar(credenciales).then(() => { terminado = true; });
  await empezoGuardado;
  assert.equal(terminado, false);
  completarGuardado();
  await resultado;
  assert.equal(terminado, true);
});

test('rechazo de login conserva su error y no toca el almacenamiento', async () => {
  const fallo = new Error('Credenciales incorrectas');
  const servicio = new InicioSesionService({ async login() { throw fallo; } }, {
    async guardar() { assert.fail('No debe guardar'); },
    async eliminar() { assert.fail('No debe eliminar'); },
  });
  await assert.rejects(servicio.iniciar(credenciales), (error) => error === fallo);
});

test('fallo al guardar limpia el token y rechaza el inicio', async () => {
  let eliminado = false;
  const servicio = new InicioSesionService(login, {
    async guardar() { throw new Error('Fallo nativo'); },
    async eliminar() { eliminado = true; },
  });
  await assert.rejects(servicio.iniciar(credenciales), /No se pudo guardar la sesión/);
  assert.equal(eliminado, true);
});

test('si también falla la limpieza no declara sesión iniciada ni borrado exitoso', async () => {
  const servicio = new InicioSesionService(login, {
    async guardar() { throw new Error('Fallo nativo'); },
    async eliminar() { throw new Error('Fallo nativo'); },
  });
  await assert.rejects(servicio.iniciar(credenciales), /No se pudo guardar ni limpiar/);
});
