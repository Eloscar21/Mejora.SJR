'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const createPasswordRecoveryRouter = require('../src/routes/passwordRecoveryRoutes');
const errorHandler = require('../src/middlewares/errorHandler');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockSolicitudPasswordRepository = require('../src/repositories/MockSolicitudPasswordRepository');
const SqlSolicitudPasswordRepository = require('../src/repositories/SqlSolicitudPasswordRepository');

describe('US-029: resolución única de solicitudes de recuperación', () => {
  const secret = 'us029_resolucion_solicitudes_pruebas';
  let usuarios;
  let solicitudes;
  let app;
  let idSolicitud;

  const payload = (accion, marca) => accion === 'aprobar'
    ? { passwordProvisional: `ClaveTemporal${marca}!`, notas: `Verificación ${marca}` }
    : { motivo: `Solicitud rechazada por verificación ${marca}` };

  const enviar = (accion, marca, id = idSolicitud, actor = 4) =>
    request(app).patch(`/api/solicitudes-password/${id}/${accion}`)
      .set('Authorization', `Bearer ${jwt.sign({ idUsuario: actor, idRol: 4 }, secret)}`)
      .send(payload(accion, marca));

  beforeEach(async () => {
    usuarios = new MockUsuarioRepository();
    usuarios.usuarios.push({ ...usuarios.usuarios[3], idUsuario: 5, email: 'otro.superadmin@test.com' });
    solicitudes = new MockSolicitudPasswordRepository(usuarios);
    const solicitud = await solicitudes.crearSolicitud({ idUsuario: 2, email: 'trabajador@test.com' });
    idSolicitud = solicitud.idSolicitud;
    app = express();
    app.use(express.json());
    app.use('/api/solicitudes-password', createPasswordRecoveryRouter(solicitudes, usuarios, secret));
    app.use(errorHandler);
  });

  test.each([
    ['aprobar', 'aprobar'], ['aprobar', 'rechazar'],
    ['rechazar', 'aprobar'], ['rechazar', 'rechazar'],
  ])('dos Superadmins leen PENDIENTE: %s contra %s produce un éxito y un conflicto', async (primera, segunda) => {
    const hashAnterior = usuarios.usuarios[1].passwordHash;
    const buscar = solicitudes.buscarPorId.bind(solicitudes);
    let lecturas = 0;
    let liberar;
    const ambasLeidas = new Promise(resolve => { liberar = resolve; });
    jest.spyOn(solicitudes, 'buscarPorId').mockImplementation(async id => {
      const copia = await buscar(id);
      if (++lecturas === 2) liberar();
      await ambasLeidas;
      return copia;
    });

    const respuestas = await Promise.all([
      enviar(primera, 'A', idSolicitud, 4),
      enviar(segunda, 'B', idSolicitud, 5),
    ]);
    expect(respuestas.map(r => r.status).sort()).toEqual([200, 409]);
    const indiceGanador = respuestas.findIndex(r => r.status === 200);
    const ganador = respuestas[indiceGanador];
    const perdedor = respuestas[1 - indiceGanador];
    expect(perdedor.body).toEqual({
      success: false, message: 'La solicitud ya fue atendida. Actualiza la bandeja antes de continuar.',
    });
    expect(perdedor.body).not.toHaveProperty('data');
    const guardada = await buscar(idSolicitud);
    expect(guardada.estado).toBe(ganador.body.data.estado);
    expect(guardada.idSuperadminResolutor).toBe(indiceGanador === 0 ? 4 : 5);
    if (guardada.estado === 'APROBADA') {
      expect(await bcrypt.compare(ganador.body.data.passwordTemporal, usuarios.usuarios[1].passwordHash)).toBe(true);
      const otra = payload(indiceGanador === 0 ? segunda : primera, indiceGanador === 0 ? 'B' : 'A');
      if (otra.passwordProvisional) {
        expect(await bcrypt.compare(otra.passwordProvisional, usuarios.usuarios[1].passwordHash)).toBe(false);
      }
    } else {
      expect(usuarios.usuarios[1].passwordHash).toBe(hashAnterior);
    }
  });

  test.each([
    ['aprobar', 'aprobar'], ['aprobar', 'rechazar'],
    ['rechazar', 'aprobar'], ['rechazar', 'rechazar'],
  ])('una solicitud atendida con %s no admite después %s', async (primera, segunda) => {
    expect((await enviar(primera, 'A')).status).toBe(200);
    const antes = await solicitudes.buscarPorId(idSolicitud);
    const hash = usuarios.usuarios[1].passwordHash;
    expect((await enviar(segunda, 'B')).status).toBe(409);
    expect(await solicitudes.buscarPorId(idSolicitud)).toEqual(antes);
    expect(usuarios.usuarios[1].passwordHash).toBe(hash);
  });

  test.each(['aprobar', 'rechazar'])('una solicitud inexistente conserva 404 al %s', async accion => {
    expect((await enviar(accion, 'A', 999)).status).toBe(404);
  });

  test('el repositorio devuelve null sin escribir si la solicitud no existe', async () => {
    const hash = usuarios.usuarios[1].passwordHash;
    expect(await solicitudes.resolverSolicitud(999, {
      estado: 'APROBADA', idSuperadmin: 4, nuevoPasswordHash: 'no_debe_guardarse',
    })).toBeNull();
    expect(usuarios.usuarios[1].passwordHash).toBe(hash);
  });

  test('el idUsuario enviado por el navegador no cambia el destinatario de la aprobación', async () => {
    const hashSuperadmin = usuarios.usuarios[3].passwordHash;
    const respuesta = await request(app).patch(`/api/solicitudes-password/${idSolicitud}/aprobar`)
      .set('Authorization', `Bearer ${jwt.sign({ idUsuario: 4, idRol: 4 }, secret)}`)
      .send({ ...payload('aprobar', 'A'), idUsuario: 4 });
    expect(respuesta.status).toBe(200);
    expect(usuarios.usuarios[3].passwordHash).toBe(hashSuperadmin);
    expect(await bcrypt.compare(respuesta.body.data.passwordTemporal, usuarios.usuarios[1].passwordHash)).toBe(true);
  });

  test('un fallo al escribir el hash no deja la solicitud aprobada en memoria', async () => {
    const cuenta = usuarios.usuarios[1];
    const hash = cuenta.passwordHash;
    Object.defineProperty(cuenta, 'passwordHash', {
      get: () => hash,
      set: () => { throw new Error('Escritura fallida'); },
    });
    const antes = await solicitudes.buscarPorId(idSolicitud);
    const respuesta = await enviar('aprobar', 'A');
    expect(respuesta.status).toBe(500);
    expect(respuesta.body.success).toBe(false);
    expect(respuesta.body).not.toHaveProperty('data');
    expect(await solicitudes.buscarPorId(idSolicitud)).toEqual(antes);
  });

  test('un usuario inexistente no deja aprobada una solicitud inconsistente en el mock', async () => {
    usuarios.usuarios = usuarios.usuarios.filter(u => u.idUsuario !== 2);
    const antes = await solicitudes.buscarPorId(idSolicitud);
    expect((await enviar('aprobar', 'A')).status).toBe(500);
    expect(await solicitudes.buscarPorId(idSolicitud)).toEqual(antes);
  });
});

describe('US-029: transacción SQL de resolución', () => {
  let transaccion;
  let bloqueoUsuarioSql;
  let solicitudesSql;
  let usuarioSql;
  let repo;
  const fila = { idSolicitud: 7, idUsuario: 2, estado: 'APROBADA' };
  const datos = { idUsuario: 2, estado: 'APROBADA', idSuperadmin: 4, nuevoPasswordHash: 'hashNuevo', notas: 'Verificado' };

  beforeEach(() => {
    transaccion = {
      begin: jest.fn().mockResolvedValue(),
      commit: jest.fn().mockResolvedValue(),
      rollback: jest.fn().mockResolvedValue(),
    };
    solicitudesSql = {
      input: jest.fn(), query: jest.fn().mockResolvedValue({ recordset: [fila], rowsAffected: [1] }),
    };
    bloqueoUsuarioSql = {
      input: jest.fn(), query: jest.fn().mockResolvedValue({ recordset: [{ IdUsuario: 2 }] }),
    };
    usuarioSql = {
      input: jest.fn(), query: jest.fn().mockResolvedValue({ rowsAffected: [1] }),
    };
    jest.spyOn(sql, 'Transaction').mockImplementation(() => transaccion);
    jest.spyOn(sql, 'Request')
      .mockImplementationOnce(() => bloqueoUsuarioSql)
      .mockImplementationOnce(() => solicitudesSql)
      .mockImplementationOnce(() => usuarioSql);
    repo = new SqlSolicitudPasswordRepository({});
  });

  afterEach(() => jest.restoreAllMocks());

  test('bloquea usuario antes de reclamar PENDIENTE y actualizar el hash en la misma transacción', async () => {
    expect(await repo.resolverSolicitud(7, datos)).toEqual(fila);
    expect(sql.Transaction).toHaveBeenCalledTimes(1);
    expect(sql.Request).toHaveBeenNthCalledWith(1, transaccion);
    expect(sql.Request).toHaveBeenNthCalledWith(2, transaccion);
    expect(sql.Request).toHaveBeenNthCalledWith(3, transaccion);
    expect(bloqueoUsuarioSql.query.mock.calls[0][0]).toContain('WITH (UPDLOCK, HOLDLOCK)');
    expect(bloqueoUsuarioSql.query.mock.invocationCallOrder[0])
      .toBeLessThan(solicitudesSql.query.mock.invocationCallOrder[0]);
    const query = solicitudesSql.query.mock.calls[0][0];
    expect(query).toContain("WHERE IdSolicitud = @IdSolicitud AND IdUsuario = @IdUsuario AND Estado = 'PENDIENTE'");
    expect(query).toContain('OUTPUT');
    expect(solicitudesSql.input).toHaveBeenCalledWith('IdSolicitud', sql.Int, 7);
    expect(solicitudesSql.input).toHaveBeenCalledWith('IdSuperadmin', sql.Int, 4);
    expect(usuarioSql.input).toHaveBeenCalledWith('IdUsuario', sql.Int, 2);
    expect(usuarioSql.query.mock.calls[0][0]).toContain('WHERE IdUsuario = @IdUsuario');
    expect(solicitudesSql.query.mock.invocationCallOrder[0]).toBeLessThan(usuarioSql.query.mock.invocationCallOrder[0]);
    expect(usuarioSql.query.mock.invocationCallOrder[0]).toBeLessThan(transaccion.commit.mock.invocationCallOrder[0]);
    expect(transaccion.rollback).not.toHaveBeenCalled();
  });

  test('sin transición obtenida devuelve null y no ejecuta la actualización de contraseña', async () => {
    solicitudesSql.query.mockResolvedValue({ recordset: [], rowsAffected: [0] });
    expect(await repo.resolverSolicitud(7, datos)).toBeNull();
    expect(sql.Request).toHaveBeenCalledTimes(2);
    expect(usuarioSql.query).not.toHaveBeenCalled();
  });

  test('si falta el usuario padre no reclama la solicitud ni escribe otro hash', async () => {
    bloqueoUsuarioSql.query.mockResolvedValue({ recordset: [] });
    await expect(repo.resolverSolicitud(7, datos)).rejects.toThrow('El usuario solicitante no existe');
    expect(solicitudesSql.query).not.toHaveBeenCalled();
    expect(usuarioSql.query).not.toHaveBeenCalled();
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
    expect(transaccion.commit).not.toHaveBeenCalled();
  });

  test('rechazar solo resuelve el estado y no cambia el hash', async () => {
    solicitudesSql.query.mockResolvedValue({ recordset: [{ ...fila, estado: 'RECHAZADA' }] });
    expect(await repo.resolverSolicitud(7, { idUsuario: 2, estado: 'RECHAZADA', idSuperadmin: 4, notas: 'No reconocido' }))
      .toMatchObject({ estado: 'RECHAZADA' });
    expect(usuarioSql.query).not.toHaveBeenCalled();
    expect(transaccion.commit).toHaveBeenCalledTimes(1);
  });

  test('si falla la escritura del hash revierte también la resolución', async () => {
    usuarioSql.query.mockRejectedValue(new Error('Error de escritura SQL'));
    await expect(repo.resolverSolicitud(7, datos)).rejects.toThrow('Error de escritura SQL');
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
    expect(transaccion.commit).not.toHaveBeenCalled();
  });

  test('si no se actualiza un usuario, revierte la resolución y no informa éxito', async () => {
    usuarioSql.query.mockResolvedValue({ rowsAffected: [0] });
    await expect(repo.resolverSolicitud(7, datos)).rejects.toThrow('No se pudo actualizar');
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
    expect(transaccion.commit).not.toHaveBeenCalled();
  });

  test('un error al reclamar la solicitud no ejecuta la escritura del hash', async () => {
    solicitudesSql.query.mockRejectedValue(new Error('Error SQL de solicitud'));
    await expect(repo.resolverSolicitud(7, datos)).rejects.toThrow('Error SQL de solicitud');
    expect(usuarioSql.query).not.toHaveBeenCalled();
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
    expect(transaccion.commit).not.toHaveBeenCalled();
  });

  test('no devuelve la resolución antes de confirmar la transacción', async () => {
    let confirmar;
    let inicioCommit;
    const esperandoCommit = new Promise(resolve => { inicioCommit = resolve; });
    transaccion.commit.mockImplementation(() => {
      inicioCommit();
      return new Promise(resolve => { confirmar = resolve; });
    });
    let finalizado = false;
    const resultado = repo.resolverSolicitud(7, datos).then(value => {
      finalizado = true;
      return value;
    });
    await esperandoCommit;
    expect(finalizado).toBe(false);
    confirmar();
    await expect(resultado).resolves.toEqual(fila);
  });

  test('si falla el commit no devuelve una aprobación como guardada', async () => {
    transaccion.commit.mockRejectedValue(new Error('Commit fallido'));
    await expect(repo.resolverSolicitud(7, datos)).rejects.toThrow('Commit fallido');
    expect(transaccion.rollback).toHaveBeenCalledTimes(1);
  });
});
