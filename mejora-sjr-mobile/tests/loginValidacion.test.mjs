import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarLogin } from '../src/viewModels/useLoginViewModel.ts';

test('campos vacíos producen errores por campo', () => {
  const errores = validarLogin({ email: '  ', password: '  ' });
  assert.ok(errores.email);
  assert.ok(errores.password);
});

test('correo mal formado o mayor a 150 caracteres se rechaza', () => {
  for (const email of ['sin-arroba', 'a@', 'a b@correo.com', `${'a'.repeat(145)}@correo.com`]) {
    assert.ok(validarLogin({ email, password: 'clave' }).email);
  }
});

test('valida sin modificar credenciales ni imponer reglas de registro', () => {
  const datos = Object.freeze({ email: ' Persona@Ejemplo.com ', password: ' x ' });
  assert.deepEqual(validarLogin(datos), {});
  assert.equal(datos.password, ' x ');
  assert.equal(datos.email, ' Persona@Ejemplo.com ');
});
