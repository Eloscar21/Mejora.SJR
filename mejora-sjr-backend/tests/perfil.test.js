'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const createPerfilRouter = require('../src/routes/perfilRoutes');
const errorHandler = require('../src/middlewares/errorHandler');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockIncidenciaRepository = require('../src/repositories/MockIncidenciaRepository');

describe('US-032: Apartado "Mis Datos" / Perfil Ciudadano API', () => {
  const secret = 'us032_jwt_secret_test';
  let usuarioRepo;
  let incidenciaRepo;
  let app;

  const tokenCiudadano = (idUsuario = 1, idRol = 1) =>
    jwt.sign({ idUsuario, idRol, idDepartamento: null }, secret, { expiresIn: '1h' });

  beforeEach(() => {
    usuarioRepo = new MockUsuarioRepository();
    incidenciaRepo = new MockIncidenciaRepository([
      {
        idIncidencia: 10,
        descripcion: 'Fuga de agua potable en colonia centro',
        latitud: 20.3888,
        longitud: -99.9958,
        idUsuario: 1,
        idCategoria: 1,
        idEstado: 1,
      },
    ]);

    app = express();
    app.use(express.json());
    app.use('/api/perfil', createPerfilRouter(usuarioRepo, incidenciaRepo, secret));
    app.use(errorHandler);
  });

  it('GET /api/perfil recupera los datos personales del ciudadano y su resumen de reportes', async () => {
    const res = await request(app)
      .get('/api/perfil')
      .set('Authorization', `Bearer ${tokenCiudadano(1, 1)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      idUsuario: 1,
      nombre: 'Ciudadano Juan',
      email: 'ciudadano@test.com',
      idRol: 1,
      rolNombre: 'Ciudadano',
      activo: true,
      resumenReportes: {
        total: 1,
        recibidos: 1,
        enProceso: 0,
        resueltos: 0,
      },
    });
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('PATCH /api/perfil actualiza nombre y correo del ciudadano autenticado', async () => {
    const res = await request(app)
      .patch('/api/perfil')
      .set('Authorization', `Bearer ${tokenCiudadano(1, 1)}`)
      .send({
        nombre: 'Juan Ciudadano Actualizado',
        email: 'juan.nuevo@test.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nombre).toBe('Juan Ciudadano Actualizado');
    expect(res.body.data.email).toBe('juan.nuevo@test.com');
  });

  it('PATCH /api/perfil rechaza con 409 un correo perteneciente a otra cuenta', async () => {
    const res = await request(app)
      .patch('/api/perfil')
      .set('Authorization', `Bearer ${tokenCiudadano(1, 1)}`)
      .send({
        nombre: 'Ciudadano Juan',
        email: 'superadmin@test.com',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});
