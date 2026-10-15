'use strict';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const { usuarioRepository } = require('../../src/config/container');
const tokenSigner = require('../../src/config/tokenSigner');

describe('POST /api/auth/renovar con firma real y repositorio simulado', () => {
  const secreto = 'secreto-exclusivo-de-pruebas-no-produccion';
  let anterior;
  const claims = { sub: 12, canal: 'movil', idRol: 1 };
  beforeEach(() => {
    anterior = process.env.JWT_SECRET;
    process.env.JWT_SECRET = secreto;
    jest.spyOn(usuarioRepository, 'buscarPorId').mockResolvedValue({
      IdUsuario: 12, Nombre: 'Ciudadano', IdRol: 2, IdDepartamento: 5
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (anterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = anterior;
  });

  test('emite 15 minutos, actualiza rol de BD y no copia expiración anterior', async () => {
    const original = jwt.sign(claims, secreto, { expiresIn: 30 });
    const res = await request(app).post('/api/auth/renovar').set('Authorization', `Bearer ${original}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['set-cookie']).toBeUndefined();
    const payload = jwt.verify(res.body.token, secreto);
    expect(payload).toMatchObject({ sub: 12, idRol: 2, idDepartamento: 5, canal: 'movil' });
    expect(payload.exp - payload.iat).toBe(900);
    expect(usuarioRepository.buscarPorId).toHaveBeenCalledWith(12);
  });

  test.each([
    ['vencido', () => jwt.sign(claims, secreto, { expiresIn: -1 })],
    ['firma ajena', () => jwt.sign(claims, 'otro-secreto', { expiresIn: 60 })],
    ['algoritmo distinto', () => jwt.sign(claims, secreto, { expiresIn: 60, algorithm: 'HS512' })],
    ['sin expiración', () => jwt.sign(claims, secreto)],
    ['web', () => jwt.sign({ ...claims, canal: 'web' }, secreto, { expiresIn: 60 })],
    ['sub no numérico', () => jwt.sign({ ...claims, sub: '12' }, secreto, { expiresIn: 60 })],
    ['aún no válido', () => jwt.sign(claims, secreto, { expiresIn: 60, notBefore: 30 })],
    ['malformado', () => 'esto-no-es-un-jwt'],
  ])('rechaza %s antes de consultar BD', async (_, crear) => {
    const res = await request(app).post('/api/auth/renovar').set('Authorization', `Bearer ${crear()}`);
    expect(res.status).toBe(401);
    expect(usuarioRepository.buscarPorId).not.toHaveBeenCalled();
  });

  test.each(['', 'Basic abc', 'Bearer', 'Bearer a b'])('rechaza cabecera inválida %s', async (header) => {
    const res = await request(app).post('/api/auth/renovar').set('Authorization', header);
    expect(res.status).toBe(401);
  });

  test.each([null, { IdUsuario: 12, IdRol: 3 }, { IdUsuario: 12, IdRol: 99 }])('rechaza usuario eliminado o rol no móvil', async (usuario) => {
    usuarioRepository.buscarPorId.mockResolvedValue(usuario);
    const res = await request(app).post('/api/auth/renovar')
      .set('Authorization', `Bearer ${tokenSigner.sign(claims)}`);
    expect(res.status).toBe(401);
  });

  test('fallo de BD no se presenta como credenciales vencidas', async () => {
    usuarioRepository.buscarPorId.mockRejectedValue(new Error('SQL no disponible'));
    const res = await request(app).post('/api/auth/renovar')
      .set('Authorization', `Bearer ${tokenSigner.sign(claims)}`);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ mensaje: 'Error interno del servidor' });
  });
});
