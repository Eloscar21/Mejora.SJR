'use strict';
const bcrypt = require('bcrypt');
const hasher = require('../../src/config/hasher');

describe('hasher', () => {
  it('debe generar un hash válido con bcrypt que coincida con la contraseña original', async () => {
    const plain = 'PasswordValido123!';
    const hash = await hasher.hash(plain);

    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$2')).toBe(true);
    expect(hash).not.toBe(plain);

    const esValida = await bcrypt.compare(plain, hash);
    expect(esValida).toBe(true);

    const esInvalida = await bcrypt.compare('OtraPasswordDistinta', hash);
    expect(esInvalida).toBe(false);
  });
});
