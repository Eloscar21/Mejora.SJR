// tests/errorHandler.test.js
'use strict';

const errorHandler = require('../src/middlewares/errorHandler');

describe('src/middlewares/errorHandler: Validación de Códigos HTTP y Protección de Datos', () => {
  let req;
  let res;
  let statusMock;
  let jsonMock;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    req = {};
    res = { status: statusMock };
    // Entorno por defecto para cada prueba
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    // Restauración inmediata de NODE_ENV después de cada test para evitar contaminación entre pruebas
    process.env.NODE_ENV = originalEnv;
  });

  describe('1. Validación estricta del tipo original y rango del código HTTP', () => {
    it('debe asignar 500 si err.statusCode es undefined o null', () => {
      const err = new Error('Fallo no controlado');
      errorHandler(err, req, res, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Fallo no controlado'
      });
    });

    it('debe asignar 500 y rechazar coerción si err.statusCode es string aunque contenga dígitos ("400")', () => {
      const err = new Error('Error con statusCode string');
      err.statusCode = '400'; // String numérico que NO debe ser coaccionado
      errorHandler(err, req, res, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error con statusCode string'
      });
    });

    it('debe asignar 500 si err.statusCode es decimal/flotante (ej. 400.5)', () => {
      const err = new Error('Error con statusCode decimal');
      err.statusCode = 400.5;
      errorHandler(err, req, res, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(500);
    });

    it('debe asignar 500 si err.statusCode está fuera del rango permitido [400, 599] (ej. 200, 302, 600)', () => {
      const codigosFueraDeRango = [200, 301, 302, 600, 999];
      codigosFueraDeRango.forEach(codigo => {
        const err = new Error(`Código ${codigo} no permitido`);
        err.statusCode = codigo;
        errorHandler(err, req, res, jest.fn());

        expect(statusMock).toHaveBeenCalledWith(500);
      });
    });

    it('debe respetar el statusCode si es explícitamente un number entero entre 400 y 599', () => {
      const codigosValidos = [400, 401, 403, 404, 409, 422, 500, 502, 503];
      codigosValidos.forEach(codigo => {
        const err = new Error('Error válido');
        err.statusCode = codigo;
        errorHandler(err, req, res, jest.fn());

        expect(statusMock).toHaveBeenCalledWith(codigo);
      });
    });
  });

  describe('2. Protección contra fuga de información en producción vs desarrollo/test', () => {
    it('en producción, debe ocultar trazas de errores 500 devolviendo "Error interno del servidor."', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('SELECT PasswordHash FROM Usuarios; Database error at dbPool.js');
      // Sin statusCode -> evalúa a 500
      errorHandler(err, req, res, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor.'
      });
    });

    it('fuera de producción (test/development), debe exponer el mensaje del error 500 para depuración', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Error detallado de base de datos para depuración');
      errorHandler(err, req, res, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error detallado de base de datos para depuración'
      });
    });

    it('en producción, para errores de negocio (4xx), debe permitir el mensaje descriptivo', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('El correo electrónico ya está registrado.');
      err.statusCode = 409;
      errorHandler(err, req, res, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'El correo electrónico ya está registrado.'
      });
    });

    it('si err.message no existe, debe asignar un mensaje genérico por defecto', () => {
      const err = {};
      errorHandler(err, req, res, jest.fn());

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Error interno del servidor.'
      });
    });
  });
});
