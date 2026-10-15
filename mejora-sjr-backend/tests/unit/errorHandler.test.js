'use strict';
const errorHandler = require('../../src/middlewares/errorHandler');
const ValidacionError = require('../../src/errors/ValidacionError');
const EmailDuplicadoError = require('../../src/errors/EmailDuplicadoError');

describe('errorHandler', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('debe responder 400 con el mensaje original si el error es ValidacionError', () => {
    errorHandler(new ValidacionError('El correo no tiene un formato válido'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'El correo no tiene un formato válido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('debe responder 409 con el mensaje original si el error es EmailDuplicadoError', () => {
    errorHandler(new EmailDuplicadoError(), req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'El correo ya está registrado' });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['un Error genérico', new Error('Login failed for user sa at azure-sql.database.windows.net')],
    ['un TypeError', new TypeError('Cannot read properties of undefined')],
    ['un valor que no es Error', 'texto lanzado con throw']
  ])('debe responder 500 genérico sin filtrar detalles técnicos si el error es %s', (_, errorInesperado) => {
    errorHandler(errorInesperado, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error interno del servidor' });

    // Nada del error original puede viajar al cliente
    const enviado = JSON.stringify(res.json.mock.calls);
    expect(enviado).not.toContain('azure');
    expect(enviado).not.toContain('Cannot read');
    expect(enviado).not.toContain('throw');
  });

  it('debe delegar a next(err) sin responder si los headers ya fueron enviados', () => {
    const error = new ValidacionError('x');
    res.headersSent = true;

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
