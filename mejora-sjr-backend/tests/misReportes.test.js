'use strict';

const { randomBytes } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const { createApp } = require('../app');
const IncidenciaService = require('../src/services/IncidenciaService');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');
const MockIncidenciaRepository = require('../src/repositories/MockIncidenciaRepository');
const MockSolicitudPasswordRepository = require('../src/repositories/MockSolicitudPasswordRepository');
const SqlIncidenciaRepository = require('../src/repositories/SqlIncidenciaRepository');

describe('US-024: GET /api/incidencias/mis-reportes', () => {
  const jwtSecret = randomBytes(32).toString('hex');
  let app;
  let incidenciaRepo;
  let propios;

  const tokenPara = (idUsuario = 1, idRol = 1, options = { expiresIn: '1h' }) => jwt.sign(
    { idUsuario, idRol, idDepartamento: idRol === 3 ? 1 : null }, jwtSecret, options
  );

  beforeEach(async () => {
    const usuarioRepo = new MockUsuarioRepository();
    usuarioRepo.usuarios.push(
      { ...usuarioRepo.usuarios[0], idUsuario: 8, nombre: 'Otra ciudadana', email: 'otra@test.com' },
      { ...usuarioRepo.usuarios[0], idUsuario: 9, nombre: 'Sin reportes', email: 'sinreportes@test.com' }
    );
    incidenciaRepo = new MockIncidenciaRepository();
    propios = [];
    for (const [idUsuario, idCategoria, descripcion] of [
      [1, 1, 'Fuga propia en el parque'],
      [1, 4, 'Bache propio en avenida'],
      [8, 1, 'Fuga de otra ciudadana'],
      [8, 4, 'Bache de otra ciudadana']
    ]) {
      const creado = await incidenciaRepo.crearIncidencia({
        idUsuario, idCategoria, descripcion, latitud: 20.3889, longitud: -99.9961,
        fotoUrl: `https://ejemplo.test/evidencia/${idUsuario}-${idCategoria}.jpg`
      });
      if (idUsuario === 1) propios.push(creado.idIncidencia);
    }
    app = createApp({
      usuarioRepository: usuarioRepo,
      catalogoRepository: new MockCatalogoRepository(),
      incidenciaRepository: incidenciaRepo,
      solicitudPasswordRepository: new MockSolicitudPasswordRepository(usuarioRepo),
      jwtSecret
    });
  });

  it('devuelve solo los reportes del ciudadano del JWT, incluso entre departamentos distintos', async () => {
    const res = await request(app)
      .get('/api/incidencias/mis-reportes')
      .set('Authorization', `Bearer ${tokenPara()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.map(reporte => reporte.idIncidencia)).toEqual(propios);
    expect(res.body.data.map(reporte => reporte.idDepartamento)).toEqual([1, 2]);
    res.body.data.forEach(reporte => {
      expect(reporte.idUsuario).toBe(1);
      expect(typeof reporte.latitud).toBe('number');
      expect(typeof reporte.longitud).toBe('number');
      expect(typeof reporte.fechaCreacion).toBe('string');
      expect(reporte.idEstado).toBe(1);
      expect(reporte.fotoInicialUrl).toMatch(/^https:\/\//);
    });
  });

  it('otro ciudadano ve sus propios reportes, no los del primero aunque compartan departamento', async () => {
    const res = await request(app)
      .get('/api/incidencias/mis-reportes')
      .set('Authorization', `Bearer ${tokenPara(8)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every(reporte => reporte.idUsuario === 8)).toBe(true);
    expect(res.body.data.some(reporte => propios.includes(reporte.idIncidencia))).toBe(false);
  });

  it('ignora los parámetros del cliente que intentan suplantar usuario o limitar el alcance del JWT', async () => {
    const listar = jest.spyOn(incidenciaRepo, 'listarIncidencias');
    const res = await request(app)
      .get('/api/incidencias/mis-reportes?idUsuario=8&idCiudadano=8&idDepartamento=2&idEstado=5&idTrabajadorAsignado=2')
      .set('Authorization', `Bearer ${tokenPara()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map(reporte => reporte.idIncidencia)).toEqual(propios);
    expect(listar).toHaveBeenCalledWith({ idUsuario: 1 });
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('devuelve un array vacío válido cuando el ciudadano no tiene reportes', async () => {
    const res = await request(app)
      .get('/api/incidencias/mis-reportes')
      .set('Authorization', `Bearer ${tokenPara(9)}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: [] });
  });

  it('sin token rechaza con 401 sin consultar el repositorio', async () => {
    const listar = jest.spyOn(incidenciaRepo, 'listarIncidencias');
    const res = await request(app).get('/api/incidencias/mis-reportes');
    expect(res.status).toBe(401);
    expect(listar).not.toHaveBeenCalled();
  });

  for (const caso of ['ilegible', 'firma ajena', 'expirado']) {
    it(`rechaza JWT ${caso} con 401 sin consultar el repositorio`, async () => {
      const token = caso === 'ilegible' ? 'token-invalido'
        : caso === 'firma ajena' ? jwt.sign({ idUsuario: 1, idRol: 1 }, randomBytes(32).toString('hex'))
          : tokenPara(1, 1, { expiresIn: '-1s' });
      const listar = jest.spyOn(incidenciaRepo, 'listarIncidencias');
      const res = await request(app)
        .get('/api/incidencias/mis-reportes')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(listar).not.toHaveBeenCalled();
    });
  }

  for (const rol of [2, 3, 4, 99]) {
    it(`no admite al rol ${rol} en la consulta exclusivamente ciudadana`, async () => {
      const listar = jest.spyOn(incidenciaRepo, 'listarIncidencias');
      const res = await request(app)
        .get('/api/incidencias/mis-reportes')
        .set('Authorization', `Bearer ${tokenPara(2, rol)}`);
      expect(res.status).toBe(403);
      expect(listar).not.toHaveBeenCalled();
    });
  }

  for (const idUsuario of [undefined, null, 0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1]) {
    it(`rechaza la identidad ciudadana inválida ${String(idUsuario)} antes de consultar`, async () => {
      const listar = jest.spyOn(incidenciaRepo, 'listarIncidencias');
      const token = jwt.sign({ idUsuario, idRol: 1 }, jwtSecret, { expiresIn: '1h' });
      const res = await request(app)
        .get('/api/incidencias/mis-reportes')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(listar).not.toHaveBeenCalled();
    });
  }

  it('el ciudadano sigue sin acceso al listado administrativo general', async () => {
    const res = await request(app)
      .get('/api/incidencias')
      .set('Authorization', `Bearer ${tokenPara()}`);
    expect(res.status).toBe(403);
  });

  it('la ausencia del filtro ciudadano conserva los listados administrativos existentes', async () => {
    const res = await request(app)
      .get('/api/incidencias')
      .set('Authorization', `Bearer ${tokenPara(4, 4)}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
  });

  it('el servicio rechaza un actor no ciudadano aunque otro módulo omita el middleware', async () => {
    const listar = jest.spyOn(incidenciaRepo, 'listarIncidencias');
    const service = new IncidenciaService(incidenciaRepo);
    await expect(service.listarMisReportes({ idUsuario: 1, idRol: 4 })).rejects.toMatchObject({ statusCode: 403 });
    expect(listar).not.toHaveBeenCalled();
  });

  it('SQL parametriza al ciudadano usando el nombre IdCiudadano de la vista, sin abrir conexión', async () => {
    const sqlRequest = {
      input: jest.fn(),
      query: jest.fn(async () => ({ recordset: [] }))
    };
    const repo = new SqlIncidenciaRepository({ request: () => sqlRequest });
    await expect(repo.listarIncidencias({ idUsuario: 1 })).resolves.toEqual([]);

    expect(sqlRequest.input).toHaveBeenCalledWith('IdUsuario', sql.Int, 1);
    expect(sqlRequest.query.mock.calls[0][0]).toMatch(/AND IdCiudadano = @IdUsuario/);
  });
});
