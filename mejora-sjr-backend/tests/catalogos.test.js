// tests/catalogos.test.js
'use strict';

const request = require('supertest');
const express = require('express');
const createCatalogoRouter = require('../src/routes/catalogoRoutes');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');
const errorHandler = require('../src/middlewares/errorHandler');

describe('US-002: API de Catálogos (Departamentos y Categorías)', () => {
  let app;
  let mockRepo;

  beforeEach(() => {
    mockRepo = new MockCatalogoRepository();
    app = express();
    app.use(express.json());
    app.use('/api/catalogos', createCatalogoRouter(mockRepo));
    app.use(errorHandler);
  });

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
});
