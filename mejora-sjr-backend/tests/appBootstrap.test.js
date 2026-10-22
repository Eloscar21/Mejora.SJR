// tests/appBootstrap.test.js
'use strict';

const request = require('supertest');
const { createApp } = require('../app');
const { validarEntorno } = require('../src/config/envValidator');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');

describe('Bloque 3: Separación de Express, Servidor y Desacoplamiento de BD', () => {
  let mockUserRepo;
  let mockCatRepo;
  const testSecret = 'secreto_seguro_para_pruebas_bootstrap_123';

  beforeEach(() => {
    mockUserRepo = new MockUsuarioRepository();
    mockCatRepo = new MockCatalogoRepository();
  });

  describe('1. Construcción aislada de la aplicación Express (createApp)', () => {
    it('debe construir la app en memoria sin abrir sockets ni puertos TCP', () => {
      const app = createApp({
        usuarioRepository: mockUserRepo,
        catalogoRepository: mockCatRepo,
        jwtSecret: testSecret
      });

      expect(app).toBeDefined();
      // Una app construida pero no escuchando carece de propiedad 'listening'
      expect(app.listening).toBeUndefined();
    });

    it('debe fallar con error descriptivo si falta usuarioRepository o catalogoRepository (cero mocks silenciosos)', () => {
      expect(() => createApp()).toThrow(
        'usuarioRepository y catalogoRepository son obligatorios para construir la aplicación.'
      );

      expect(() => createApp({ usuarioRepository: mockUserRepo })).toThrow(
        'usuarioRepository y catalogoRepository son obligatorios para construir la aplicación.'
      );
    });

    it('debe responder 200 OK en /health a través de la app construida', async () => {
      const app = createApp({
        usuarioRepository: mockUserRepo,
        catalogoRepository: mockCatRepo,
        jwtSecret: testSecret
      });

      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'OK', message: 'Servidor Mejora SJR activo.' });
    });

    it('debe resolver rutas con dependencias inyectadas (catálogos)', async () => {
      const app = createApp({
        usuarioRepository: mockUserRepo,
        catalogoRepository: mockCatRepo,
        jwtSecret: testSecret
      });

      const res = await request(app).get('/api/catalogos/departamentos');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('2. Validación Fail-Fast del Entorno (envValidator)', () => {
    it('debe lanzar ConfigValidationError si JWT_SECRET no está definido', () => {
      const envInvalido = { PORT: '5000' };
      expect(() => validarEntorno(envInvalido)).toThrow('JWT_SECRET es obligatorio');
    });

    it('debe lanzar error si JWT_SECRET está vacío o contiene solo espacios', () => {
      expect(() => validarEntorno({ JWT_SECRET: '' })).toThrow('JWT_SECRET es obligatorio');
      expect(() => validarEntorno({ JWT_SECRET: '   ' })).toThrow('JWT_SECRET es obligatorio');
    });

    it('debe lanzar error si PORT no es un número entero válido', () => {
      const envConPuertoInvalido = { JWT_SECRET: testSecret, PORT: 'puerto_invalido' };
      expect(() => validarEntorno(envConPuertoInvalido)).toThrow('PORT debe ser un número entero válido');
    });

    it('debe rechazar DATA_SOURCE="mock" si NODE_ENV="production"', () => {
      const envProdConMock = {
        JWT_SECRET: testSecret,
        NODE_ENV: 'production',
        DATA_SOURCE: 'mock'
      };
      expect(() => validarEntorno(envProdConMock)).toThrow('está estrictamente prohibido en entorno de producción');
    });

    it('debe aprobar configuración válida devolviendo objeto sanitizado', () => {
      const envValido = {
        JWT_SECRET: `  ${testSecret}  `,
        PORT: '8080',
        NODE_ENV: 'development',
        DATA_SOURCE: 'mock'
      };

      const resultado = validarEntorno(envValido);
      expect(resultado.port).toBe(8080);
      expect(resultado.jwtSecret).toBe(testSecret); // Sanitizado con trim
      expect(resultado.nodeEnv).toBe('development');
      expect(resultado.dataSource).toBe('mock');
    });
  });
});
