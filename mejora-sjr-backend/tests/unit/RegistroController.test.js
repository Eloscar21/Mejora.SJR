'use strict';
const RegistroController = require('../../src/controllers/RegistroController');
const ValidacionError = require('../../src/errors/ValidacionError');

describe('RegistroController', () => {
  let controller;
  let mockRegistroService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockRegistroService = {
      registrar: jest.fn()
    };
    controller = new RegistroController({ registroService: mockRegistroService });

    req = {
      body: {
        nombre: 'Isaac Ochoa',
        email: 'isaac@ejemplo.com',
        password: 'PasswordValido123!'
      }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  it('debe responder 201 Created cuando el servicio registra exitosamente', async () => {
    mockRegistroService.registrar.mockResolvedValue();

    await controller.registrar(req, res, next);

    expect(mockRegistroService.registrar).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        mensaje: expect.any(String)
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('debe atrapar cualquier error del servicio y delegarlo a next(error)', async () => {
    const errorSimulado = new Error('Fallo de dominio o infraestructura');
    mockRegistroService.registrar.mockRejectedValue(errorSimulado);

    await controller.registrar(req, res, next);

    expect(next).toHaveBeenCalledWith(errorSimulado);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it.each([
    ['body está vacío', {}],
    ['falta nombre', { email: 'isaac@ejemplo.com', password: 'PasswordValido123!' }],
    ['falta email', { nombre: 'Isaac Ochoa', password: 'PasswordValido123!' }],
    ['falta password', { nombre: 'Isaac Ochoa', email: 'isaac@ejemplo.com' }],
    ['body es undefined', undefined]
  ])('debe rechazar inmediatamente y llamar a next(ValidacionError) si %s', async (_, bodyInvalido) => {
    req.body = bodyInvalido;

    await controller.registrar(req, res, next);

    expect(mockRegistroService.registrar).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(ValidacionError));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
