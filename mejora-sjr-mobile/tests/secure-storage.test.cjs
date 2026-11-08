const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// El driver sustituye solo la API nativa: se ejercita el adaptador TypeScript real.
const source = fs.readFileSync(path.join(__dirname, '../src/services/storage/SecureStorageService.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const nativeDriver = {
  async getItemAsync() { throw new Error('Se requiere un driver en las pruebas de Node.'); },
  async setItemAsync() { throw new Error('Se requiere un driver en las pruebas de Node.'); },
  async deleteItemAsync() { throw new Error('Se requiere un driver en las pruebas de Node.'); },
};
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require(name) {
    assert.equal(name, 'expo-secure-store');
    return nativeDriver;
  },
});
const { SecureStorageService } = exportsObject;

function createDriver() {
  const values = new Map();
  return {
    values,
    async getItemAsync(key) { return values.get(key) ?? null; },
    async setItemAsync(key, value) {
      assert.match(key, /^[\w.-]+$/);
      values.set(key, value);
    },
    async deleteItemAsync(key) { values.delete(key); },
  };
}

test('lee null cuando no existe una sesión', async () => {
  assert.equal(await new SecureStorageService(createDriver()).getItem('@token'), null);
});

test('conserva token y usuario al reconstruir el adaptador', async () => {
  const driver = createDriver();
  const first = new SecureStorageService(driver);
  await first.setItem('@mejora_sjr_mobile_token', 'token-de-prueba');
  await first.setItem('@mejora_sjr_mobile_user', '{"idRol":1}');
  const restored = new SecureStorageService(driver);
  assert.equal(await restored.getItem('@mejora_sjr_mobile_token'), 'token-de-prueba');
  assert.equal(await restored.getItem('@mejora_sjr_mobile_user'), '{"idRol":1}');
});

test('serializa escrituras de distintas instancias sin perder entradas', async () => {
  const driver = createDriver();
  const first = new SecureStorageService(driver);
  const second = new SecureStorageService(driver);
  await Promise.all([first.setItem('@token', 'jwt'), second.setItem('@user', 'usuario')]);
  assert.equal(await first.getItem('@token'), 'jwt');
  assert.equal(await second.getItem('@user'), 'usuario');
});

test('una lectura espera la escritura solicitada antes', async () => {
  const storage = new SecureStorageService(createDriver());
  const write = storage.setItem('@token', 'jwt');
  const read = storage.getItem('@token');
  assert.equal(await read, 'jwt');
  await write;
});

test('removeItem conserva otras entradas y elimina el contenedor al quedar vacío', async () => {
  const driver = createDriver();
  const storage = new SecureStorageService(driver);
  await storage.setItem('@token', 'jwt');
  await storage.setItem('@user', 'usuario');
  await storage.removeItem('@token');
  assert.equal(await storage.getItem('@token'), null);
  assert.equal(await storage.getItem('@user'), 'usuario');
  await storage.removeItem('@user');
  assert.equal(driver.values.size, 0);
});

test('clear espera operaciones previas y solo elimina su contenedor', async () => {
  const driver = createDriver();
  driver.values.set('otro_modulo', 'conservar');
  const storage = new SecureStorageService(driver);
  const write = storage.setItem('@token', 'jwt');
  const clear = storage.clear();
  assert.equal(await storage.getItem('@token'), null);
  await Promise.all([write, clear]);
  assert.equal(driver.values.get('otro_modulo'), 'conservar');
  assert.equal(driver.values.size, 1);
});

test('propaga errores de escritura y permite reintentar sin fingir persistencia', async () => {
  const driver = createDriver();
  const write = driver.setItemAsync;
  driver.setItemAsync = async () => { throw new Error('Almacén no disponible'); };
  const storage = new SecureStorageService(driver);
  await assert.rejects(storage.setItem('@token', 'jwt'), /Almacén no disponible/);
  assert.equal(await storage.getItem('@token'), null);
  driver.setItemAsync = write;
  await storage.setItem('@token', 'nuevo');
  assert.equal(await storage.getItem('@token'), 'nuevo');
});

test('propaga errores de lectura y borrado del dispositivo', async () => {
  const driver = createDriver();
  const storage = new SecureStorageService(driver);
  driver.getItemAsync = async () => { throw new Error('Lectura bloqueada'); };
  await assert.rejects(storage.getItem('@token'), /Lectura bloqueada/);
  driver.deleteItemAsync = async () => { throw new Error('Borrado bloqueado'); };
  await assert.rejects(storage.clear(), /Borrado bloqueado/);
});

test('rechaza JSON corrupto o valores inválidos sin sobrescribirlos', async () => {
  const driver = createDriver();
  const storage = new SecureStorageService(driver);
  await storage.setItem('@token', 'jwt');
  const [containerKey] = driver.values.keys();
  for (const invalid of ['{', 'null', '[]', '"texto"', '{"@token":123}']) {
    driver.values.set(containerKey, invalid);
    await assert.rejects(storage.getItem('@token'), /datos inválidos/);
    await assert.rejects(storage.setItem('@user', 'usuario'), /datos inválidos/);
    assert.equal(driver.values.get(containerKey), invalid);
  }
  await storage.clear();
  assert.equal(await storage.getItem('@token'), null);
});

test('admite claves lógicas especiales sin alterar el prototipo', async () => {
  const storage = new SecureStorageService(createDriver());
  await storage.setItem('__proto__', 'valor');
  await storage.setItem('', 'vacío');
  assert.equal(await storage.getItem('__proto__'), 'valor');
  assert.equal(await storage.getItem(''), 'vacío');
  assert.equal(await storage.getItem('toString'), null);
});
