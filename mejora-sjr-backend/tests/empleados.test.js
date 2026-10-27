// tests/empleados.test.js
'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');

describe('US-008: API CRUD de Empleados', () => {
  const TEST_JWT_SECRET = 'secreto_super_seguro_de_pruebas_unitarias_32_chars';
  let app;
  let usuarioRepo;
  let catalogoRepo;
  let superadminToken;
  let adminJapamToken;
  let ciudadanoToken;

  beforeEach(() => {
    usuarioRepo = new MockUsuarioRepository();
    catalogoRepo = new MockCatalogoRepository();
    app = createApp({
      usuarioRepository: usuarioRepo,
      catalogoRepository: catalogoRepo,
      jwtSecret: TEST_JWT_SECRET
    });

    // Generar tokens con claims
    superadminToken = jwt.sign(
      { idUsuario: 4, email: 'superadmin@test.com', idRol: 4, idDepartamento: null },
      TEST_JWT_SECRET
    );

    adminJapamToken = jwt.sign(
      { idUsuario: 3, email: 'admin@test.com', idRol: 3, idDepartamento: 1 },
      TEST_JWT_SECRET
    );

    ciudadanoToken = jwt.sign(
      { idUsuario: 1, email: 'ciudadano@test.com', idRol: 1, idDepartamento: null },
      TEST_JWT_SECRET
    );
  });

  describe('Control de Acceso y RBAC (401 / 403)', () => {
    it('debe rechazar solicitudes sin token con 401', async () => {
      const res = await request(app).get('/api/empleados');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Token no proporcionado/i);
    });

    it('debe rechazar solicitudes con token inválido con 401', async () => {
      const res = await request(app)
        .get('/api/empleados')
        .set('Authorization', 'Bearer token_invalido');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('debe prohibir el acceso a Ciudadanos (Rol 1) con 403', async () => {
      const res = await request(app)
        .get('/api/empleados')
        .set('Authorization', `Bearer ${ciudadanoToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/privilegios suficientes/i);
    });
  });

  describe('POST /api/empleados (Crear Empleado)', () => {
    it('Superadmin crea un Trabajador (Rol 2) en JAPAM (Depto 1) con éxito', async () => {
      const nuevoTrabajador = {
        nombre: 'Carlos Cuadrilla',
        email: 'carlos.cuadrilla@test.com',
        password: 'Password123!',
        idRol: 2,
        idDepartamento: 1
      };

      const res = await request(app)
        .post('/api/empleados')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(nuevoTrabajador);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.idUsuario).toBeDefined();
      expect(res.body.data.email).toBe(nuevoTrabajador.email);
      expect(res.body.data.idRol).toBe(2);
      expect(res.body.data.idDepartamento).toBe(1);
      expect(res.body.data.passwordHash).toBeUndefined(); // Zero-Trust: no exponer hash
    });

    it('debe fallar con 400 si un Trabajador (Rol 2) no tiene departamento asignado', async () => {
      const sinDepto = {
        nombre: 'Pedro Sin Depto',
        email: 'pedro.sindepto@test.com',
        password: 'Password123!',
        idRol: 2,
        idDepartamento: null
      };

      const res = await request(app)
        .post('/api/empleados')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(sinDepto);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/departamento válido asignado/i);
    });

    it('debe rechazar con 409 si el correo electrónico ya existe', async () => {
      const repetido = {
        nombre: 'Duplicado',
        email: 'trabajador@test.com',
        password: 'Password123!',
        idRol: 2,
        idDepartamento: 1
      };

      const res = await request(app)
        .post('/api/empleados')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(repetido);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/ya está registrado/i);
    });
  });

  describe('GET /api/empleados (Listar Empleados Activos)', () => {
    it('Superadmin lista todos los empleados activos (roles 2 y 3)', async () => {
      const res = await request(app)
        .get('/api/empleados')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Solo deben listarse roles de empleados (2 y 3), no Ciudadanos (1)
      const idsRoles = res.body.data.map(e => e.idRol);
      expect(idsRoles).not.toContain(1);
    });

    it('Admin de Departamento (Rol 3) solo visualiza empleados de su departamento', async () => {
      const res = await request(app)
        .get('/api/empleados')
        .set('Authorization', `Bearer ${adminJapamToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(empleado => {
        expect(empleado.idDepartamento).toBe(1);
      });
    });
  });

  describe('PUT /api/empleados/:id (Editar Empleado)', () => {
    it('Superadmin edita nombre, rol y depto de un empleado con éxito', async () => {
      const cambios = {
        nombre: 'Pedro Actualizado',
        idRol: 3,
        idDepartamento: 2
      };

      const res = await request(app)
        .put('/api/empleados/2')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send(cambios);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nombre).toBe('Pedro Actualizado');
      expect(res.body.data.idRol).toBe(3);
      expect(res.body.data.idDepartamento).toBe(2);
    });

    it('debe responder 404 si el empleado a editar no existe', async () => {
      const res = await request(app)
        .put('/api/empleados/999')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ nombre: 'X', idRol: 2, idDepartamento: 1 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/empleados/:id (Soft Delete)', () => {
    it('desactiva lógicamente al empleado cambiando activo a 0', async () => {
      const res = await request(app)
        .patch('/api/empleados/2')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/desactivado/i);

      // Verificar que ya no aparece en el listado de activos
      const listado = await request(app)
        .get('/api/empleados')
        .set('Authorization', `Bearer ${superadminToken}`);

      const idsActivos = listado.body.data.map(e => e.idUsuario);
      expect(idsActivos).not.toContain(2);
    });

    it('prohíbe que un usuario se auto-desactive (400)', async () => {
      const res = await request(app)
        .patch('/api/empleados/4') // Superadmin ID 4 intentando auto-desactivarse
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/propia cuenta/i);
    });
  });
});
