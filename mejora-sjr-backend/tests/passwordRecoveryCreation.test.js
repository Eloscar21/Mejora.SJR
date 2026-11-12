'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const crypto = require('node:crypto');
const createPasswordRecoveryRouter = require('../src/routes/passwordRecoveryRoutes');
const errorHandler = require('../src/middlewares/errorHandler');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockSolicitudPasswordRepository = require('../src/repositories/MockSolicitudPasswordRepository');
const SqlSolicitudPasswordRepository = require('../src/repositories/SqlSolicitudPasswordRepository');

describe('US-029: una solicitud pendiente por usuario', () => {
  const secret = 'us029_creacion_solicitudes_pruebas';
  let usuarios;
  let solicitudes;
  let app;
  const solicitar = (email = 'trabajador@test.com') =>
    request(app).post('/api/solicitudes-password/solicitar').send({ email });
  const resolver = (id, accion) => request(app)
    .patch(`/api/solicitudes-password/${id}/${accion}`)
    .set('Authorization', `Bearer ${jwt.sign({ idUsuario: 4, idRol: 4 }, secret)}`)
    .send(accion === 'aprobar' ? { passwordProvisional: 'Provisional2026!' } : { motivo: 'No reconocido por el empleado' });

  beforeEach(() => {
    usuarios = new MockUsuarioRepository();
    solicitudes = new MockSolicitudPasswordRepository(usuarios);
    app = express();
    app.use(express.json());
    app.use('/api/solicitudes-password', createPasswordRecoveryRouter(solicitudes, usuarios, secret));
    app.use(errorHandler);
  });

  test('peticiones concurrentes reutilizan una sola pendiente sin revelar si ya existía', async () => {
    const listar = jest.spyOn(solicitudes, 'listarSolicitudes');
    const respuestas = await Promise.all(Array.from({ length: 20 }, () => solicitar()));
    expect(respuestas.every(r => r.status === 200)).toBe(true);
    expect(new Set(respuestas.map(r => JSON.stringify(r.body))).size).toBe(1);
    expect(respuestas[0].body).not.toHaveProperty('data');
    expect(solicitudes.solicitudes).toHaveLength(1);
    expect(listar).not.toHaveBeenCalled();
  });

  test('repetir con un correo normalizado conserva ID, fecha y próximo ID', async () => {
    expect((await solicitar()).status).toBe(200);
    const antes = { ...solicitudes.solicitudes[0] };
    const siguienteId = solicitudes.nextId;
    expect((await solicitar('  TRABAJADOR@TEST.COM  ')).status).toBe(200);
    expect(solicitudes.solicitudes).toEqual([antes]);
    expect(solicitudes.nextId).toBe(siguienteId);
  });

  test('la unicidad se limita a cada usuario, sin bloquear otras cuentas del personal', async () => {
    const respuestas = await Promise.all([solicitar(), solicitar('admin@test.com')]);
    expect(respuestas.map(r => r.status)).toEqual([200, 200]);
    expect(solicitudes.solicitudes.map(s => s.idUsuario).sort()).toEqual([2, 3]);
  });

  test.each(['aprobar', 'rechazar'])('permite una nueva solicitud después de %s, conservando el historial', async accion => {
    await solicitar();
    const idAnterior = solicitudes.solicitudes[0].idSolicitud;
    expect((await resolver(idAnterior, accion)).status).toBe(200);
    expect((await solicitar()).status).toBe(200);
    expect(solicitudes.solicitudes).toHaveLength(2);
    expect(solicitudes.solicitudes.filter(s => s.estado === 'PENDIENTE')).toHaveLength(1);
    expect(solicitudes.solicitudes[1].idSolicitud).not.toBe(idAnterior);
  });

  test.each(['ciudadano@test.com', 'superadmin@test.com', 'inexistente@test.com'])
    ('conserva la respuesta neutral sin crear solicitudes para %s', async email => {
      const respuesta = await solicitar(email);
      expect(respuesta.status).toBe(200);
      expect(respuesta.body.success).toBe(true);
      expect(solicitudes.solicitudes).toHaveLength(0);
      expect(respuesta.body).toEqual((await solicitar('otra.inexistente@test.com')).body);
    });

  test('el mock devuelve copias y considera el ID del usuario, no el correo del segundo intento', async () => {
    const primera = await solicitudes.crearSolicitud({ idUsuario: 2, email: 'trabajador@test.com' });
    const segunda = await solicitudes.crearSolicitud({ idUsuario: 2, email: 'otro.correo@test.com' });
    expect(segunda).toEqual(primera);
    segunda.estado = 'APROBADA';
    expect(solicitudes.solicitudes[0].estado).toBe('PENDIENTE');
  });

  test('la clave automática tiene 22 caracteres, funciona con bcrypt y no se guarda en claro', async () => {
    await solicitar();
    const id = solicitudes.solicitudes[0].idSolicitud;
    const respuesta = await request(app)
      .patch(`/api/solicitudes-password/${id}/aprobar`)
      .set('Authorization', `Bearer ${jwt.sign({ idUsuario: 4, idRol: 4 }, secret)}`)
      .send({});
    expect(respuesta.status).toBe(200);
    const clave = respuesta.body.data.passwordTemporal;
    expect(clave).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(await bcrypt.compare(clave, usuarios.usuarios[1].passwordHash)).toBe(true);
    expect(JSON.stringify(usuarios.usuarios)).not.toContain(clave);
    expect(JSON.stringify(solicitudes.solicitudes)).not.toContain(clave);
  });
});

describe('US-029: generación criptográfica de claves temporales', () => {
  afterEach(() => jest.restoreAllMocks());

  test('solicita 16 bytes a node:crypto y conserva los 128 bits al codificar en base64url', () => {
    const bytes = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const generar = jest.spyOn(crypto, 'randomBytes').mockReturnValue(bytes);
    let Servicio;
    jest.isolateModules(() => { Servicio = require('../src/services/PasswordRecoveryService'); });
    const clave = new Servicio({}, {}).generarPasswordTemporal();
    expect(generar).toHaveBeenCalledTimes(1);
    expect(generar).toHaveBeenCalledWith(16);
    expect(clave).toHaveLength(22);
    expect(Buffer.from(clave, 'base64url')).toEqual(bytes);
  });

  test('si falla la fuente criptográfica propaga el error, sin recurrir a Math.random', () => {
    const fallo = new Error('Fuente criptográfica no disponible');
    jest.spyOn(crypto, 'randomBytes').mockImplementation(() => { throw fallo; });
    const aleatorioDebil = jest.spyOn(Math, 'random');
    let Servicio;
    jest.isolateModules(() => { Servicio = require('../src/services/PasswordRecoveryService'); });
    expect(() => new Servicio({}, {}).generarPasswordTemporal()).toThrow(fallo);
    expect(aleatorioDebil).not.toHaveBeenCalled();
  });
});

describe('US-029: creación SQL serializada por usuario', () => {
  let transaccion;
  let bloqueo;
  let consulta;
  let insercion;
  let repo;
  const fila = { idSolicitud: 7, idUsuario: 2, email: 'trabajador@test.com', estado: 'PENDIENTE', fechaSolicitud: '2026-11-12T12:00:00.000Z' };

  beforeEach(() => {
    transaccion = { begin: jest.fn().mockResolvedValue(), commit: jest.fn().mockResolvedValue(), rollback: jest.fn().mockResolvedValue() };
    bloqueo = { input: jest.fn(), query: jest.fn().mockResolvedValue({ recordset: [{ IdUsuario: 2 }] }) };
    consulta = { input: jest.fn(), query: jest.fn().mockResolvedValue({ recordset: [] }) };
    insercion = { input: jest.fn(), query: jest.fn().mockResolvedValue({ recordset: [fila] }) };
    jest.spyOn(sql, 'Transaction').mockImplementation(() => transaccion);
    jest.spyOn(sql, 'Request')
      .mockImplementationOnce(() => bloqueo)
      .mockImplementationOnce(() => consulta)
      .mockImplementationOnce(() => insercion);
    repo = new SqlSolicitudPasswordRepository({});
  });

  afterEach(() => jest.restoreAllMocks());

  test('bloquea la fila padre antes de consultar pendientes e insertar, en la misma transacción', async () => {
    expect(await repo.crearSolicitud({ idUsuario: 2, email: ' TRABAJADOR@TEST.COM ' })).toEqual(fila);
    expect(sql.Request.mock.calls).toEqual([[transaccion], [transaccion], [transaccion]]);
    expect(bloqueo.input).toHaveBeenCalledWith('IdUsuario', sql.Int, 2);
    expect(bloqueo.query.mock.calls[0][0]).toContain('WITH (UPDLOCK, HOLDLOCK)');
    expect(bloqueo.query.mock.calls[0][0]).toContain('WHERE IdUsuario = @IdUsuario');
    expect(bloqueo.query.mock.calls[0][0]).not.toContain('TABLOCK');
    expect(consulta.query.mock.calls[0][0]).toContain("IdUsuario = @IdUsuario AND Estado = 'PENDIENTE'");
    expect(insercion.input).toHaveBeenCalledWith('Email', sql.VarChar(150), 'trabajador@test.com');
    expect(bloqueo.query.mock.invocationCallOrder[0]).toBeLessThan(consulta.query.mock.invocationCallOrder[0]);
    expect(consulta.query.mock.invocationCallOrder[0]).toBeLessThan(insercion.query.mock.invocationCallOrder[0]);
    expect(insercion.query.mock.invocationCallOrder[0]).toBeLessThan(transaccion.commit.mock.invocationCallOrder[0]);
    expect(transaccion.rollback).not.toHaveBeenCalled();
  });

  test('devuelve la pendiente existente sin insertar ni modificar su fecha o correo', async () => {
    consulta.query.mockResolvedValue({ recordset: [fila] });
    expect(await repo.crearSolicitud({ idUsuario: 2, email: 'diferente@test.com' })).toEqual(fila);
    expect(insercion.query).not.toHaveBeenCalled();
    expect(sql.Request).toHaveBeenCalledTimes(2);
    expect(transaccion.commit).toHaveBeenCalledTimes(1);
  });

  test('sin la fila padre no consulta pendientes ni inserta y revierte la transacción', async () => {
    bloqueo.query.mockResolvedValue({ recordset: [] });
    await expect(repo.crearSolicitud({ idUsuario: 999, email: 'nadie@test.com' })).rejects.toThrow('no existe');
    expect(consulta.query).not.toHaveBeenCalled();
    expect(insercion.query).not.toHaveBeenCalled();
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
    expect(transaccion.commit).not.toHaveBeenCalled();
  });

  test.each(['bloqueo', 'consulta', 'insercion'])('un fallo en %s revierte y no declara creación', async fase => {
    ({ bloqueo, consulta, insercion })[fase].query.mockRejectedValue(new Error(`Fallo en ${fase}`));
    await expect(repo.crearSolicitud({ idUsuario: 2, email: fila.email })).rejects.toThrow(`Fallo en ${fase}`);
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
    expect(transaccion.commit).not.toHaveBeenCalled();
  });

  test('no devuelve la solicitud antes del commit', async () => {
    let confirmar;
    let inicio;
    const esperando = new Promise(resolve => { inicio = resolve; });
    transaccion.commit.mockImplementation(() => {
      inicio();
      return new Promise(resolve => { confirmar = resolve; });
    });
    let finalizado = false;
    const resultado = repo.crearSolicitud({ idUsuario: 2, email: fila.email }).then(value => {
      finalizado = true;
      return value;
    });
    await esperando;
    expect(finalizado).toBe(false);
    confirmar();
    await expect(resultado).resolves.toEqual(fila);
  });

  test('un commit fallido se propaga y no devuelve una solicitud como confirmada', async () => {
    transaccion.commit.mockRejectedValue(new Error('Commit fallido'));
    await expect(repo.crearSolicitud({ idUsuario: 2, email: fila.email })).rejects.toThrow('Commit fallido');
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
  });
});
