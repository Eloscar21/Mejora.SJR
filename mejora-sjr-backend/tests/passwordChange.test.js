'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const createAuthRouter = require('../src/routes/authRoutes');
const errorHandler = require('../src/middlewares/errorHandler');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const SqlUsuarioRepository = require('../src/repositories/SqlUsuarioRepository');
const PasswordChangeService = require('../src/services/PasswordChangeService');

describe('US-029: cambio de contraseña propia', () => {
  const secret = 'us029_secret_exclusivo_para_pruebas';
  const cambio = {
    passwordActual: 'Password123!',
    passwordNueva: 'NuevaClave2026!',
    confirmarPassword: 'NuevaClave2026!',
  };
  let repo;
  let app;

  const token = (idUsuario = 3, idRol = 3, options = {}) =>
    jwt.sign({ idUsuario, idRol }, secret, { expiresIn: '5m', ...options });
  const enviar = (body = cambio, bearer = token()) => {
    const req = request(app).patch('/api/auth/password');
    if (bearer) req.set('Authorization', `Bearer ${bearer}`);
    return req.send(body);
  };

  beforeEach(() => {
    repo = new MockUsuarioRepository();
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(repo, secret));
    app.use(errorHandler);
  });

  test.each([[3, 3], [4, 4]])('rol %s cambia su clave y puede iniciar sesión con la nueva', async (id, rol) => {
    const res = await enviar(cambio, token(id, rol));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Tu contraseña se actualizó correctamente.' });
    expect(res.headers['cache-control']).toBe('no-store');
    const usuario = await repo.buscarPorId(id);
    expect(usuario.passwordHash).not.toBe(cambio.passwordNueva);
    expect(await bcrypt.compare(cambio.passwordNueva, usuario.passwordHash)).toBe(true);
    const nuevaSesion = await request(app).post('/api/auth/login').send({
      email: usuario.email, password: cambio.passwordNueva,
    });
    expect(nuevaSesion.status).toBe(200);
    const viejaSesion = await request(app).post('/api/auth/login').send({
      email: usuario.email, password: cambio.passwordActual,
    });
    expect(viejaSesion.status).toBe(401);
  });

  test('el cuerpo no puede elegir la cuenta ni cambiar rol, correo o estado', async () => {
    const anterior = await repo.buscarPorId(4);
    const res = await enviar({ ...cambio, idUsuario: 4, idRol: 4, activo: false, email: 'otro@test.com' });
    expect(res.status).toBe(200);
    expect(await repo.buscarPorId(4)).toEqual(anterior);
    const actor = await repo.buscarPorId(3);
    expect(actor).toMatchObject({ idRol: 3, activo: 1, email: 'admin@test.com' });
    expect(await bcrypt.compare(cambio.passwordNueva, actor.passwordHash)).toBe(true);
  });

  test.each([
    ['ausente', null],
    ['firma incorrecta', jwt.sign({ idUsuario: 3, idRol: 3 }, 'otra_firma')],
    ['expirado', token(3, 3, { expiresIn: -1 })],
  ])('rechaza JWT %s antes de consultar credenciales', async (_, bearer) => {
    const lectura = jest.spyOn(repo, 'obtenerCredencialesPorId');
    expect((await enviar(cambio, bearer)).status).toBe(401);
    expect(lectura).not.toHaveBeenCalled();
  });

  test.each([1, 2, 5])('rechaza rol %s antes de consultar credenciales', async rol => {
    const lectura = jest.spyOn(repo, 'obtenerCredencialesPorId');
    expect((await enviar(cambio, token(rol, rol))).status).toBe(403);
    expect(lectura).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, '3', null])('rechaza identidad no válida: %s', async id => {
    expect((await enviar(cambio, token(id, 3))).status).toBe(401);
  });

  test.each([
    [{}, 'obligatorias'],
    [{ ...cambio, passwordActual: 123 }, 'obligatorias'],
    [{ ...cambio, passwordNueva: ['NuevaClave2026!'] }, 'obligatorias'],
    [{ ...cambio, confirmarPassword: null }, 'obligatorias'],
    [{ ...cambio, passwordNueva: 'corta', confirmarPassword: 'corta' }, '8 caracteres'],
    [{ ...cambio, passwordNueva: '        ', confirmarPassword: '        ' }, '8 caracteres'],
    [{ ...cambio, passwordNueva: 'a'.repeat(73), confirmarPassword: 'a'.repeat(73) }, '72 bytes'],
    [{ ...cambio, passwordNueva: 'á'.repeat(37), confirmarPassword: 'á'.repeat(37) }, '72 bytes'],
    [{ ...cambio, passwordActual: 'a'.repeat(1025) }, 'tamaño permitido'],
    [{ ...cambio, confirmarPassword: 'OtraClave2026!' }, 'confirmación'],
    [{ ...cambio, passwordActual: 'incorrecta' }, 'actual es incorrecta'],
    [{ ...cambio, passwordNueva: 'Password123!', confirmarPassword: 'Password123!' }, 'diferente'],
  ])('no escribe si el cambio es inválido (%s)', async (body, mensaje) => {
    const escritura = jest.spyOn(repo, 'cambiarPasswordSiCoincide');
    const antes = (await repo.buscarPorId(3)).passwordHash;
    const res = await enviar(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(mensaje);
    expect(escritura).not.toHaveBeenCalled();
    expect((await repo.buscarPorId(3)).passwordHash).toBe(antes);
  });

  test('acepta 72 bytes UTF-8 y conserva espacios significativos', async () => {
    const nueva = ` ${'á'.repeat(35)} `;
    expect(Buffer.byteLength(nueva)).toBe(72);
    expect((await enviar({ ...cambio, passwordNueva: nueva, confirmarPassword: nueva })).status).toBe(200);
    const hash = (await repo.buscarPorId(3)).passwordHash;
    expect(await bcrypt.compare(nueva, hash)).toBe(true);
    expect(await bcrypt.compare(nueva.trim(), hash)).toBe(false);
  });

  test.each([0, false])('una cuenta desactivada (%s) no puede cambiar clave con su JWT anterior', async activo => {
    repo.usuarios.find(u => u.idUsuario === 3).activo = activo;
    const escritura = jest.spyOn(repo, 'cambiarPasswordSiCoincide');
    expect((await enviar()).status).toBe(401);
    expect(escritura).not.toHaveBeenCalled();
  });

  test('rechaza una cuenta eliminada o con rol distinto al del JWT', async () => {
    expect((await enviar(cambio, token(999, 3))).status).toBe(401);
    repo.usuarios.find(u => u.idUsuario === 3).idRol = 2;
    expect((await enviar()).status).toBe(403);
  });

  test.each(['passwordHash', 'activo', 'idRol'])('un cambio simultáneo de %s produce 409 sin sobrescribir', async campo => {
    const hashAnterior = (await repo.buscarPorId(3)).passwordHash;
    const original = repo.cambiarPasswordSiCoincide.bind(repo);
    jest.spyOn(repo, 'cambiarPasswordSiCoincide').mockImplementation(async datos => {
      const cuenta = repo.usuarios.find(u => u.idUsuario === 3);
      cuenta[campo] = { passwordHash: 'hash_modificado_por_otra_operacion', activo: 0, idRol: 2 }[campo];
      return original(datos);
    });
    const res = await enviar();
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    const cuenta = await repo.buscarPorId(3);
    expect(cuenta.passwordHash).toBe(campo === 'passwordHash'
      ? 'hash_modificado_por_otra_operacion' : hashAnterior);
  });

  test('dos cambios que verificaron la misma clave solo pueden escribir una vez', async () => {
    const lectura = repo.obtenerCredencialesPorId.bind(repo);
    let lecturas = 0;
    let liberar;
    const ambasLeidas = new Promise(resolve => { liberar = resolve; });
    jest.spyOn(repo, 'obtenerCredencialesPorId').mockImplementation(async id => {
      const copia = await lectura(id);
      if (++lecturas === 2) liberar();
      await ambasLeidas;
      return copia;
    });
    const service = new PasswordChangeService(repo);
    const otroCambio = { ...cambio, passwordNueva: 'SegundaClave2026!', confirmarPassword: 'SegundaClave2026!' };
    const resultados = await Promise.allSettled([
      service.cambiarPassword(cambio, { idUsuario: 3, idRol: 3 }),
      service.cambiarPassword(otroCambio, { idUsuario: 3, idRol: 3 }),
    ]);
    expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.find(r => r.status === 'rejected').reason.statusCode).toBe(409);
    const hash = (await repo.buscarPorId(3)).passwordHash;
    const coincidencias = await Promise.all([
      bcrypt.compare(cambio.passwordNueva, hash), bcrypt.compare(otroCambio.passwordNueva, hash),
    ]);
    expect(coincidencias.filter(Boolean)).toHaveLength(1);
  });

  test('solo informa éxito después de que la persistencia confirma', async () => {
    let confirmar;
    let persistiendo;
    const inicio = new Promise(resolve => { persistiendo = resolve; });
    const pendiente = new Promise(resolve => { confirmar = resolve; });
    jest.spyOn(repo, 'cambiarPasswordSiCoincide').mockImplementation(() => {
      persistiendo();
      return pendiente;
    });
    const service = new PasswordChangeService(repo);
    let finalizado = false;
    const resultado = service.cambiarPassword(cambio, { idUsuario: 3, idRol: 3 }).then(value => {
      finalizado = true;
      return value;
    });
    await inicio;
    expect(finalizado).toBe(false);
    confirmar(true);
    await expect(resultado).resolves.toEqual({ mensaje: 'Tu contraseña se actualizó correctamente.' });
  });

  test('un fallo de almacenamiento no declara éxito ni devuelve credenciales', async () => {
    jest.spyOn(repo, 'cambiarPasswordSiCoincide').mockRejectedValue(new Error('Persistencia no disponible'));
    const res = await enviar();
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body).not.toHaveProperty('data');
    expect(JSON.stringify(res.body)).not.toContain(cambio.passwordNueva);
  });

  test('mantiene la política actual de JWT, sin emitir un token al cambiar la clave', async () => {
    const bearer = token();
    expect((await enviar(cambio, bearer)).body).not.toHaveProperty('token');
    const segundoCambio = {
      passwordActual: cambio.passwordNueva, passwordNueva: 'OtraClave2027!', confirmarPassword: 'OtraClave2027!',
    };
    expect((await enviar(segundoCambio, bearer)).status).toBe(200);
  });
});

describe('US-029: adaptador SQL de credenciales', () => {
  const crearRepo = respuesta => {
    const req = { input: jest.fn(), query: jest.fn().mockResolvedValue(respuesta) };
    const repo = new SqlUsuarioRepository({ request: () => req });
    return { repo, req };
  };

  test('consulta credenciales por ID con parámetro SQL sin cambiar la consulta general de usuarios', async () => {
    const credenciales = { idUsuario: 3, idRol: 3, activo: true, passwordHash: 'hash' };
    const { repo, req } = crearRepo({ recordset: [credenciales] });
    expect(await repo.obtenerCredencialesPorId(3)).toEqual(credenciales);
    expect(req.input).toHaveBeenCalledWith('IdUsuario', sql.Int, 3);
    expect(req.query.mock.calls[0][0]).toMatch(/WHERE IdUsuario = @IdUsuario/);
    await repo.buscarPorId(3);
    expect(req.query.mock.calls[1][0]).not.toContain('PasswordHash');
  });

  test('la consulta de una cuenta inexistente devuelve null', async () => {
    const { repo } = crearRepo({ recordset: [] });
    expect(await repo.obtenerCredencialesPorId(999)).toBeNull();
  });

  test.each([[1, true], [0, false]])('confirma únicamente una fila actualizada: %s', async (filas, esperado) => {
    const { repo, req } = crearRepo({ rowsAffected: [filas] });
    expect(await repo.cambiarPasswordSiCoincide({
      idUsuario: 3, idRol: 3, passwordHashAnterior: 'hashAnterior', nuevoPasswordHash: 'hashNuevo',
    })).toBe(esperado);
    expect(req.input.mock.calls.map(call => call[0])).toEqual([
      'IdUsuario', 'IdRol', 'PasswordHashAnterior', 'NuevoPasswordHash',
    ]);
    const query = req.query.mock.calls[0][0];
    expect(query).toContain('IdUsuario = @IdUsuario');
    expect(query).toContain('Activo = 1');
    expect(query).toContain('IdRol = @IdRol');
    expect(query).toContain('COLLATE Latin1_General_100_BIN2 = @PasswordHashAnterior');
    expect(query).not.toContain('hashAnterior');
    expect(query).not.toContain('hashNuevo');
  });
});
