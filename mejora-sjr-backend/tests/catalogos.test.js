// tests/catalogos.test.js
'use strict';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const createCatalogoRouter = require('../src/routes/catalogoRoutes');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');
const errorHandler = require('../src/middlewares/errorHandler');

describe('US-002: API de Catálogos (Departamentos y Categorías)', () => {
  let app;
  let mockRepo;
  const JWT_SECRET = 'test_secret_catalogos_123';

  beforeEach(() => {
    mockRepo = new MockCatalogoRepository();
    app = express();
    app.use(express.json());
    app.use('/api/catalogos', createCatalogoRouter(mockRepo, JWT_SECRET));
    app.use(errorHandler);
  });

  const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  };

  describe('GET /api/catalogos/departamentos', () => {
    it('debe retornar la lista de departamentos oficiales (JAPAM y Servicios Públicos)', async () => {
      const res = await request(app).get('/api/catalogos/departamentos');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data).toEqual([
        { idDepartamento: 1, nombre: 'JAPAM' },
        { idDepartamento: 2, nombre: 'Servicios Públicos' }
      ]);
    });
  });

  describe('GET /api/catalogos/categorias', () => {
    it('debe retornar todas las categorías con la llave foránea resuelta (departamentoNombre)', async () => {
      const res = await request(app).get('/api/catalogos/categorias');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(4);

      // Validar relación de llave foránea exacta según reglas de negocio
      const catFugas = res.body.data.find(c => c.idCategoria === 1);
      expect(catFugas.nombre).toBe('Fugas de agua');
      expect(catFugas.idDepartamento).toBe(1);
      expect(catFugas.departamentoNombre).toBe('JAPAM');

      const catBacheo = res.body.data.find(c => c.idCategoria === 4);
      expect(catBacheo.nombre).toBe('Bacheo');
      expect(catBacheo.idDepartamento).toBe(2);
      expect(catBacheo.departamentoNombre).toBe('Servicios Públicos');
    });

    it('debe filtrar correctamente las categorías de JAPAM (idDepartamento=1)', async () => {
      const res = await request(app).get('/api/catalogos/categorias?idDepartamento=1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach(cat => {
        expect(cat.idDepartamento).toBe(1);
        expect(cat.departamentoNombre).toBe('JAPAM');
      });
    });

    it('debe filtrar correctamente las categorías de Servicios Públicos (idDepartamento=2)', async () => {
      const res = await request(app).get('/api/catalogos/categorias?idDepartamento=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach(cat => {
        expect(cat.idDepartamento).toBe(2);
        expect(cat.departamentoNombre).toBe('Servicios Públicos');
      });
    });

    it('debe rechazar con 400 cuando idDepartamento no es numérico', async () => {
      const res = await request(app).get('/api/catalogos/categorias?idDepartamento=invalido');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('idDepartamento debe ser un número entero válido');
    });
  });

  describe('US-030: Aislamiento Departamental en Catálogos (JAPAM vs Servicios Públicos)', () => {
    it('Admin JAPAM (Rol 3, Depto 1) solo debe recibir la dependencia JAPAM', async () => {
      const token = generateToken({ idUsuario: 3, idRol: 3, idDepartamento: 1, email: 'emily@japam.com' });
      const res = await request(app)
        .get('/api/catalogos/departamentos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toEqual({ idDepartamento: 1, nombre: 'JAPAM' });
    });

    it('Admin JAPAM (Rol 3, Depto 1) solo debe recibir las categorías de JAPAM', async () => {
      const token = generateToken({ idUsuario: 3, idRol: 3, idDepartamento: 1, email: 'emily@japam.com' });
      const res = await request(app)
        .get('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((cat) => {
        expect(cat.idDepartamento).toBe(1);
        expect(cat.departamentoNombre).toBe('JAPAM');
      });
    });

    it('Admin JAPAM que intente consultar categorías de Servicios Públicos debe recibir 403 Forbidden', async () => {
      const token = generateToken({ idUsuario: 3, idRol: 3, idDepartamento: 1, email: 'emily@japam.com' });
      const res = await request(app)
        .get('/api/catalogos/categorias?idDepartamento=2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('No tienes autorización para consultar o gestionar catálogos de otra dependencia');
    });

    it('Admin Servicios Públicos (Rol 3, Depto 2) solo debe recibir Servicios Públicos y sus categorías', async () => {
      const token = generateToken({ idUsuario: 8, idRol: 3, idDepartamento: 2, email: 'admin.sp@sjr.gob.mx' });

      const resDeptos = await request(app)
        .get('/api/catalogos/departamentos')
        .set('Authorization', `Bearer ${token}`);
      expect(resDeptos.status).toBe(200);
      expect(resDeptos.body.data).toHaveLength(1);
      expect(resDeptos.body.data[0].idDepartamento).toBe(2);

      const resCats = await request(app)
        .get('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${token}`);
      expect(resCats.status).toBe(200);
      expect(resCats.body.data).toHaveLength(2);
      resCats.body.data.forEach((c) => expect(c.idDepartamento).toBe(2));

      const resCruzado = await request(app)
        .get('/api/catalogos/categorias?idDepartamento=1')
        .set('Authorization', `Bearer ${token}`);
      expect(resCruzado.status).toBe(403);
    });

    it('Superadmin (Rol 4) debe tener acceso global a todos los departamentos y categorías', async () => {
      const token = generateToken({ idUsuario: 1, idRol: 4, email: 'superadmin@sjr.gob.mx' });

      const resDeptos = await request(app)
        .get('/api/catalogos/departamentos')
        .set('Authorization', `Bearer ${token}`);
      expect(resDeptos.status).toBe(200);
      expect(resDeptos.body.data).toHaveLength(2);

      const resCats = await request(app)
        .get('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${token}`);
      expect(resCats.status).toBe(200);
      expect(resCats.body.data).toHaveLength(4);
    });
  });

  describe('US-035: Creación y Persistencia de Nuevas Categorías (POST /api/catalogos/categorias)', () => {
    it('Superadmin (Rol 4) puede crear una nueva categoría en cualquier departamento', async () => {
      const token = generateToken({ idUsuario: 4, idRol: 4, email: 'superadmin@sjr.gob.mx' });
      const res = await request(app)
        .post('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Recolección de escombro', idDepartamento: 2 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(expect.objectContaining({
        idCategoria: 5,
        nombre: 'Recolección de escombro',
        idDepartamento: 2,
        departamentoNombre: 'Servicios Públicos'
      }));

      // Verificar que GET /api/catalogos/categorias ya incluye la nueva categoría
      const resGet = await request(app).get('/api/catalogos/categorias');
      expect(resGet.body.data).toHaveLength(5);
    });

    it('Admin JAPAM (Rol 3, Depto 1) puede crear una categoría para JAPAM pero recibe 403 si intenta crearla para Servicios Públicos', async () => {
      const token = generateToken({ idUsuario: 3, idRol: 3, idDepartamento: 1, email: 'admin.japam@sjr.gob.mx' });

      const resOk = await request(app)
        .post('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Medidores averiados', idDepartamento: 1 });

      expect(resOk.status).toBe(201);
      expect(resOk.body.data.idDepartamento).toBe(1);
      expect(resOk.body.data.departamentoNombre).toBe('JAPAM');

      const resForbidden = await request(app)
        .post('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Poda de árboles', idDepartamento: 2 });

      expect(resForbidden.status).toBe(403);
      expect(resForbidden.body.success).toBe(false);
    });

    it('rechaza con 409 una categoría duplicada en el mismo departamento y con 403 a Ciudadanos (Rol 1)', async () => {
      const tokenSuper = generateToken({ idUsuario: 4, idRol: 4 });
      const resDup = await request(app)
        .post('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${tokenSuper}`)
        .send({ nombre: 'Fugas de agua', idDepartamento: 1 });

      expect(resDup.status).toBe(409);

      const tokenCiudadano = generateToken({ idUsuario: 1, idRol: 1 });
      const resCiudadano = await request(app)
        .post('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${tokenCiudadano}`)
        .send({ nombre: 'Categoría ciudadana', idDepartamento: 1 });

      expect(resCiudadano.status).toBe(403);
    });
  });

  describe('PATCH /api/catalogos/categorias/:id/estado (US-037)', () => {
    it('Admin JAPAM (Rol 3, Depto 1) puede marcar como inactiva una categoría de su departamento y el ciudadano deja de verla', async () => {
      const tokenAdmin = generateToken({ idUsuario: 3, idRol: 3, idDepartamento: 1 });

      const resPatch = await request(app)
        .patch('/api/catalogos/categorias/1/estado')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ activo: false });

      expect(resPatch.status).toBe(200);
      expect(resPatch.body.success).toBe(true);
      expect(resPatch.body.data.activo).toBe(false);

      // Consulta del ciudadano (sin token o Rol 1): categoría 1 ya NO debe aparecer
      const resCiudadano = await request(app).get('/api/catalogos/categorias');
      expect(resCiudadano.status).toBe(200);
      const idsVisibles = resCiudadano.body.data.map(c => c.idCategoria);
      expect(idsVisibles).not.toContain(1);
      expect(idsVisibles).toEqual([2, 3, 4]);

      // Consulta del Admin (Rol 3): sigue viendo todas para poder reactivarlas
      const resAdmin = await request(app)
        .get('/api/catalogos/categorias')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(resAdmin.status).toBe(200);
      const cat1Admin = resAdmin.body.data.find(c => c.idCategoria === 1);
      expect(cat1Admin).toBeDefined();
      expect(cat1Admin.activo).toBe(false);
    });

    it('rechaza con 403 si un Admin de Depto intenta cambiar el estado de una categoría de otra dependencia', async () => {
      const tokenJapam = generateToken({ idUsuario: 3, idRol: 3, idDepartamento: 1 });

      // Categoría 3 pertenece a Servicios Públicos (Depto 2)
      const res = await request(app)
        .patch('/api/catalogos/categorias/3/estado')
        .set('Authorization', `Bearer ${tokenJapam}`)
        .send({ activo: false });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
