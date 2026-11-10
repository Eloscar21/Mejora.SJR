'use strict';

const { randomBytes } = require('node:crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');
const EmpleadoService = require('../src/services/EmpleadoService');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');

describe('US-021: consulta departamental y gestión exclusiva del Superadmin', () => {
  const jwtSecret = randomBytes(32).toString('hex');
  const adminJapam = { idUsuario: 6, idRol: 3, idDepartamento: 1 };
  let app;
  let usuarioRepo;

  const tokenPara = (claims, options = { expiresIn: '1h' }) => jwt.sign(claims, jwtSecret, options);

  beforeEach(() => {
    usuarioRepo = new MockUsuarioRepository();
    usuarioRepo.usuarios.push(
      { idUsuario: 5, nombre: 'Trabajadora SP', email: 'trabajadora.sp@test.com', idRol: 2, idDepartamento: 2, activo: 1 },
      { idUsuario: 6, nombre: 'Admin JAPAM', email: 'admin.japam@test.com', idRol: 3, idDepartamento: 1, activo: 1 },
      { idUsuario: 7, nombre: 'Trabajador inactivo', email: 'inactivo@test.com', idRol: 2, idDepartamento: 1, activo: 0 }
    );
    app = createApp({
      usuarioRepository: usuarioRepo,
      catalogoRepository: new MockCatalogoRepository(),
      jwtSecret
    });
  });

  it.each([
    ['post', '/api/empleados', { nombre: 'Nuevo trabajador', email: 'nuevo@test.com', password: 'Password123!', idRol: 2, idDepartamento: 1 }],
    ['put', '/api/empleados/2', { nombre: 'Cambio indebido', idRol: 2, idDepartamento: 1 }],
    ['patch', '/api/empleados/2', undefined],
    ['post', '/api/usuarios/empleados', { nombre: 'Nuevo trabajador', email: 'nuevo.alias@test.com', password: 'Password123!', idRol: 2, idDepartamento: 1 }],
    ['put', '/api/usuarios/empleados/2', { nombre: 'Cambio indebido', idRol: 2, idDepartamento: 1 }],
    ['patch', '/api/usuarios/empleados/2', undefined]
  ])('rechaza %s de rol 3 antes de acceder al repositorio y conserva los datos', async (method, path, body) => {
    const datosPrevios = usuarioRepo.usuarios.map(usuario => ({ ...usuario }));
    const accesos = ['buscarPorEmail', 'buscarPorId', 'crearUsuario', 'actualizarEmpleado', 'desactivarEmpleado']
      .map(nombre => jest.spyOn(usuarioRepo, nombre));

    let peticion = request(app)[method](path).set('Authorization', `Bearer ${tokenPara(adminJapam)}`);
    if (body) peticion = peticion.send(body);
    const res = await peticion;

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    accesos.forEach(acceso => expect(acceso).not.toHaveBeenCalled());
    expect(usuarioRepo.usuarios).toEqual(datosPrevios);
  });

  it.each([1, 2])('rol 3 consulta solo trabajadores activos del departamento %s del JWT', async idDepartamento => {
    const res = await request(app)
      .get('/api/empleados?soloActivos=true')
      .set('Authorization', `Bearer ${tokenPara({ ...adminJapam, idDepartamento })}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map(empleado => empleado.idUsuario)).toEqual([idDepartamento === 1 ? 2 : 5]);
    res.body.data.forEach(empleado => {
      expect(empleado.idRol).toBe(2);
      expect(empleado.idDepartamento).toBe(idDepartamento);
      expect(empleado.activo).toBe(true);
      expect(empleado.passwordHash).toBeUndefined();
    });
  });

  it('rol 3 recibe activos e inactivos propios por defecto mediante el alias de US-020', async () => {
    const res = await request(app)
      .get('/api/usuarios/empleados')
      .set('Authorization', `Bearer ${tokenPara(adminJapam)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map(empleado => empleado.idUsuario)).toEqual([2, 7]);
    expect(res.body.data.map(empleado => empleado.activo)).toEqual([true, false]);
    res.body.data.forEach(empleado => {
      expect(empleado.idRol).toBe(2);
      expect(empleado.idDepartamento).toBe(1);
      expect(empleado.passwordHash).toBeUndefined();
    });
  });

  it('ignora filtros enviados por el cliente que intentan ampliar el departamento o los roles', async () => {
    const res = await request(app)
      .get('/api/empleados?idDepartamento=2&roles=2,3&idRol=3')
      .set('Authorization', `Bearer ${tokenPara(adminJapam)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map(empleado => empleado.idUsuario)).toEqual([2, 7]);
  });

  it('devuelve vacío cuando no hay trabajadores propios, sin incluir administradores ni otros departamentos', async () => {
    usuarioRepo.usuarios = usuarioRepo.usuarios.filter(usuario => !(usuario.idRol === 2 && usuario.idDepartamento === 1));
    const res = await request(app)
      .get('/api/empleados')
      .set('Authorization', `Bearer ${tokenPara(adminJapam)}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it.each([null, undefined, 0, -1, '1', 1.5])('rechaza departamento inválido %s antes de consultar datos', async idDepartamento => {
    const consulta = jest.spyOn(usuarioRepo, 'obtenerEmpleados');
    const res = await request(app)
      .get('/api/empleados')
      .set('Authorization', `Bearer ${tokenPara({ ...adminJapam, idDepartamento })}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(consulta).not.toHaveBeenCalled();
  });

  it('el Superadmin conserva el listado de trabajadores y administradores de todos los departamentos', async () => {
    const res = await request(app)
      .get('/api/empleados')
      .set('Authorization', `Bearer ${tokenPara({ idUsuario: 4, idRol: 4, idDepartamento: null })}`);

    expect(res.status).toBe(200);
    expect(res.body.data.map(empleado => empleado.idUsuario).sort((a, b) => a - b)).toEqual([2, 3, 5, 6, 7]);
  });

  it.each([2, 99])('rechaza la consulta del rol no admitido %s', async idRol => {
    const consulta = jest.spyOn(usuarioRepo, 'obtenerEmpleados');
    const res = await request(app)
      .get('/api/empleados')
      .set('Authorization', `Bearer ${tokenPara({ ...adminJapam, idRol })}`);

    expect(res.status).toBe(403);
    expect(consulta).not.toHaveBeenCalled();
  });

  it.each(['firma ajena', 'expirado'])('rechaza con 401 un JWT de rol 3 con %s', async caso => {
    const token = caso === 'firma ajena'
      ? jwt.sign(adminJapam, randomBytes(32).toString('hex'), { expiresIn: '1h' })
      : tokenPara(adminJapam, { expiresIn: '-1s' });
    const consulta = jest.spyOn(usuarioRepo, 'obtenerEmpleados');
    const res = await request(app)
      .get('/api/empleados')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(consulta).not.toHaveBeenCalled();
  });

  it.each([
    ['crearEmpleado', [{ nombre: 'Nombre', email: 'servicio@test.com', password: 'Password123!', idRol: 2, idDepartamento: 1 }]],
    ['actualizarEmpleado', [2, { nombre: 'Nombre', idRol: 2, idDepartamento: 1 }]],
    ['desactivarEmpleado', [2]]
  ])('también impide %s de rol 3 si otro módulo llama al servicio directamente', async (metodo, argumentos) => {
    const datosPrevios = usuarioRepo.usuarios.map(usuario => ({ ...usuario }));
    const service = new EmpleadoService(usuarioRepo);

    await expect(service[metodo](...argumentos, adminJapam)).rejects.toMatchObject({ statusCode: 403 });
    expect(usuarioRepo.usuarios).toEqual(datosPrevios);
  });
});
