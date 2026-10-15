'use strict';
const request = require('supertest');
const app = require('../../app');
const { usuarioRepository } = require('../../src/config/container');

describe('E2E: POST /api/auth/registro', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('debe responder 201 Created cuando los datos son válidos y no hay duplicados', async () => {
    jest.spyOn(usuarioRepository, 'buscarPorEmail').mockResolvedValue(null);
    jest.spyOn(usuarioRepository, 'crear').mockResolvedValue({
      IdUsuario: 1,
      Nombre: 'Isaac Ochoa',
      Email: 'isaac@ejemplo.com',
      IdRol: 1,
      IdDepartamento: null
    });

    const payload = {
      nombre: 'Isaac Ochoa',
      email: 'isaac@ejemplo.com',
      password: 'PasswordSeguro123!'
    };

    const response = await request(app)
      .post('/api/auth/registro')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      mensaje: 'Ciudadano registrado exitosamente'
    });
  });

  it('debe responder 400 Bad Request si faltan campos obligatorios', async () => {
    const response = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Isaac Ochoa' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('mensaje');
  });

  it('debe responder 409 Conflict si el correo ya existe en la base de datos', async () => {
    jest.spyOn(usuarioRepository, 'buscarPorEmail').mockResolvedValue({
      IdUsuario: 99,
      Email: 'duplicado@ejemplo.com'
    });

    const response = await request(app)
      .post('/api/auth/registro')
      .send({
        nombre: 'Isaac Ochoa',
        email: 'duplicado@ejemplo.com',
        password: 'PasswordSeguro123!'
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      mensaje: 'El correo ya está registrado'
    });
  });
});
