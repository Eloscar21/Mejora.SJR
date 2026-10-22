// tests/auth.test.js
'use strict';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const createAuthRouter = require('../src/routes/authRoutes');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const errorHandler = require('../src/middlewares/errorHandler');

describe('US-001: Autenticación y Mocks Multirrol', () => {
  let app;
  let mockRepo;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    // Garantizar secreto válido por defecto en las pruebas de rutas
    process.env.JWT_SECRET = 'secreto_seguro_para_pruebas_unitarias_auth_test_123';
    mockRepo = new MockUsuarioRepository();
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(mockRepo));
    app.use(errorHandler);
  });

  afterEach(() => {
    // Restauración incondicional para evitar contaminación entre suites
    process.env.JWT_SECRET = originalJwtSecret;
  });

  describe('Validación Fail-Fast de JWT_SECRET en AuthService', () => {
    it('debe lanzar un error durante la instanciación si JWT_SECRET no está definido', () => {
      delete process.env.JWT_SECRET;
      const AuthService = require('../src/services/AuthService');
      expect(() => new AuthService(mockRepo)).toThrow(
        'JWT_SECRET no está configurado o es inválido en las variables de entorno.'
      );
    });

    it('debe lanzar un error si JWT_SECRET es una cadena vacía', () => {
      process.env.JWT_SECRET = '';
      const AuthService = require('../src/services/AuthService');
      expect(() => new AuthService(mockRepo)).toThrow(
        'JWT_SECRET no está configurado o es inválido en las variables de entorno.'
      );
    });

    it('debe lanzar un error si JWT_SECRET contiene únicamente espacios en blanco', () => {
      process.env.JWT_SECRET = '     ';
      const AuthService = require('../src/services/AuthService');
      expect(() => new AuthService(mockRepo)).toThrow(
        'JWT_SECRET no está configurado o es inválido en las variables de entorno.'
      );
    });

    it('debe instanciarse correctamente cuando se pasa un secreto válido por constructor', () => {
      delete process.env.JWT_SECRET;
      const AuthService = require('../src/services/AuthService');
      const authService = new AuthService(mockRepo, 'clave_inyectada_valida_123');
      expect(authService).toBeDefined();
    });
  });

  describe('POST /api/auth/registro', () => {
    it('debe registrar un ciudadano con IdRol=1 e IdDepartamento=null y devolver JWT', async () => {
      const payload = {
        nombre: 'Carlos Sanchez',
        email: 'carlos@test.com',
        password: 'Password123!'
      };

      const res = await request(app)
        .post('/api/auth/registro')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usuario.email).toBe('carlos@test.com');
      expect(res.body.data.usuario.idRol).toBe(1);
      expect(res.body.data.usuario.idDepartamento).toBeNull();
      expect(res.body.data.usuario.passwordHash).toBeUndefined();
      expect(res.body.data.token).toBeDefined();

      // Verificar decodificación del JWT
      const decoded = jwt.decode(res.body.data.token);
      expect(decoded.idRol).toBe(1);
      expect(decoded.idDepartamento).toBeNull();
    });

    it('debe rechazar registro con correo duplicado con 409', async () => {
      const payload = {
        nombre: 'Duplicado',
        email: 'ciudadano@test.com', // ya existe en el mock inicial
        password: 'Password123!'
      };

      const res = await request(app)
        .post('/api/auth/registro')
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('El correo electrónico ya está registrado.');
    });

    it('debe rechazar registro sin contraseña con 400', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({ nombre: 'Sin Pass', email: 'sinpass@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login - Mocks Multirrol', () => {
    it('debe autenticar Ciudadano (Rol 1, Depto null)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ciudadano@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.data.usuario.idRol).toBe(1);
      expect(res.body.data.usuario.idDepartamento).toBeNull();
      const decoded = jwt.decode(res.body.data.token);
      expect(decoded.idRol).toBe(1);
      expect(decoded.idDepartamento).toBeNull();
    });

    it('debe autenticar Trabajador (Rol 2, Depto 1 - JAPAM)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'trabajador@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.data.usuario.idRol).toBe(2);
      expect(res.body.data.usuario.idDepartamento).toBe(1);
      const decoded = jwt.decode(res.body.data.token);
      expect(decoded.idRol).toBe(2);
      expect(decoded.idDepartamento).toBe(1);
    });

    it('debe autenticar Admin de Departamento (Rol 3, Depto 2 - Servicios Públicos)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.data.usuario.idRol).toBe(3);
      expect(res.body.data.usuario.idDepartamento).toBe(2);
      const decoded = jwt.decode(res.body.data.token);
      expect(decoded.idRol).toBe(3);
      expect(decoded.idDepartamento).toBe(2);
    });

    it('debe autenticar Superadmin (Rol 4, Depto null)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'superadmin@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.data.usuario.idRol).toBe(4);
      expect(res.body.data.usuario.idDepartamento).toBeNull();
      const decoded = jwt.decode(res.body.data.token);
      expect(decoded.idRol).toBe(4);
      expect(decoded.idDepartamento).toBeNull();
    });

    it('debe rechazar contraseña incorrecta con 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ciudadano@test.com', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Credenciales inválidas.');
    });

    it('debe rechazar usuario inexistente con 401 sin revelar existencia', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noexiste@test.com', password: 'Password123!' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Credenciales inválidas.');
    });
  });
});
