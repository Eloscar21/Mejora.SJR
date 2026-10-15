'use strict';
const express = require('express');
const request = require('supertest');
const LoginService = require('../../src/services/LoginService');
const LoginController = require('../../src/controllers/LoginController');
const errorHandler = require('../../src/middlewares/errorHandler');

describe('Login compartido por web y móvil', () => {
  let app;
  let usuarioRepository;
  let hasher;
  let tokenSigner;

  beforeEach(() => {
    usuarioRepository = {
      buscarPorEmailConHash: jest.fn().mockResolvedValue({
        IdUsuario: 10, Nombre: 'Usuario de prueba', IdRol: 3,
        PasswordHash: 'hash-de-prueba', IdDepartamento: null
      })
    };
    hasher = { compare: jest.fn().mockResolvedValue(true) };
    tokenSigner = { sign: jest.fn().mockReturnValue('token-de-prueba') };
    const loginService = new LoginService({ usuarioRepository, hasher, tokenSigner });
    const controller = new LoginController({ loginService });
    app = express();
    app.use(express.json());
    app.post('/api/auth/login', controller.login);
    app.use(errorHandler);
  });

  const credenciales = { email: 'persona@ejemplo.com', password: 'clave-de-prueba' };

  test.each([undefined, 'web'])('web conserva cookie y no expone token: %s', async (canal) => {
    const res = await request(app).post('/api/auth/login').send({ ...credenciales, canal });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mensaje: 'Login exitoso' });
    expect(res.headers['set-cookie'][0]).toContain('mejora_sjr_token=token-de-prueba');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('SameSite=Strict');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test.each([
    ['web', 1, 401], ['web', 2, 401], ['web', 3, 200], ['web', 4, 200],
    ['movil', 1, 200], ['movil', 2, 200], ['movil', 3, 401], ['movil', 4, 401],
    ['web', 99, 401], ['movil', 99, 401]
  ])('%s con rol BD %s responde %s', async (canal, idRol, status) => {
    usuarioRepository.buscarPorEmailConHash.mockResolvedValue({
      IdUsuario: 10, Nombre: 'Usuario de prueba', IdRol: idRol, PasswordHash: 'hash-de-prueba'
    });
    // Un rol enviado por el cliente no debe sustituir al recuperado de BD.
    const res = await request(app).post('/api/auth/login').send({ ...credenciales, canal, idRol: 4 });
    expect(res.status).toBe(status);
    if (status === 401) {
      expect(tokenSigner.sign).not.toHaveBeenCalled();
      expect(res.headers['set-cookie']).toBeUndefined();
      expect(res.body.token).toBeUndefined();
    } else {
      expect(tokenSigner.sign).toHaveBeenCalledWith(expect.objectContaining({ idRol }));
      if (canal === 'movil') {
        expect(res.body).toEqual({ mensaje: 'Login exitoso', token: 'token-de-prueba' });
        expect(res.headers['set-cookie']).toBeUndefined();
        expect(res.headers['cache-control']).toBe('no-store');
      }
    }
  });

  test.each([null, '', 'otro', 'WEB', 1, {}, []])('rechaza canal inválido: %j', async (canal) => {
    const res = await request(app).post('/api/auth/login').send({ ...credenciales, canal });
    expect(res.status).toBe(400);
    expect(usuarioRepository.buscarPorEmailConHash).not.toHaveBeenCalled();
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });

  test.each(['web', 'movil'])('contraseña incorrecta no entrega sesión: %s', async (canal) => {
    hasher.compare.mockResolvedValue(false);
    const res = await request(app).post('/api/auth/login').send({ ...credenciales, canal });
    expect(res.status).toBe(401);
    expect(tokenSigner.sign).not.toHaveBeenCalled();
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('usuario inexistente no recibe token', async () => {
    usuarioRepository.buscarPorEmailConHash.mockResolvedValue(null);
    const res = await request(app).post('/api/auth/login').send({ ...credenciales, canal: 'movil' });
    expect(res.status).toBe(401);
    expect(tokenSigner.sign).not.toHaveBeenCalled();
  });
});
