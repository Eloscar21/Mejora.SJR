// tests/rbacMiddleware.test.js
'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { requireSuperadmin, authorizeSuperadmin, authenticateToken } = require('../src/middlewares/authMiddleware');
const errorHandler = require('../src/middlewares/errorHandler');

describe('US-007: Middleware RBAC de Autorización Estricta (IdRol === 4)', () => {
  const TEST_SECRET = 'secreto_super_seguro_de_pruebas_rbac_32_chars';
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Ruta de gestión protegida estrictamente para Superadmin (IdRol === 4)
    app.get('/api/admin/gestion-restringida', requireSuperadmin(TEST_SECRET), (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Acceso concedido a ruta de gestión.',
        user: req.user
      });
    });

    app.use(errorHandler);
  });

  const generarToken = (idRol, email = 'test@test.com', idUsuario = 10) => {
    return jwt.sign(
      { idUsuario, email, idRol, idDepartamento: idRol === 3 ? 1 : null },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
  };

  it('1. Debe rechazar con 401 si no se proporciona el token Bearer', async () => {
    const res = await request(app).get('/api/admin/gestion-restringida');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Token no proporcionado/i);
  });

  it('2. Debe rechazar con 401 si el token es inválido o corrupto', async () => {
    const res = await request(app)
      .get('/api/admin/gestion-restringida')
      .set('Authorization', 'Bearer token_invalido_xyz');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Token inválido o expirado/i);
  });

  it('3. Debe rechazar con 403 a un Ciudadano (IdRol = 1)', async () => {
    const token = generarToken(1, 'ciudadano@test.com');
    const res = await request(app)
      .get('/api/admin/gestion-restringida')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Se requieren privilegios estrictos de Superadmin/i);
  });

  it('4. Debe rechazar con 403 a un Trabajador de Campo (IdRol = 2)', async () => {
    const token = generarToken(2, 'trabajador@test.com');
    const res = await request(app)
      .get('/api/admin/gestion-restringida')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Se requieren privilegios estrictos de Superadmin/i);
  });

  it('5. Debe rechazar con 403 a un Administrador de Departamento (IdRol = 3)', async () => {
    const token = generarToken(3, 'admin.depto@test.com');
    const res = await request(app)
      .get('/api/admin/gestion-restringida')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Se requieren privilegios estrictos de Superadmin/i);
  });

  it('6. Debe PERMITIR el acceso con 200 únicamente al Superadmin (IdRol = 4)', async () => {
    const token = generarToken(4, 'superadmin@test.com', 4);
    const res = await request(app)
      .get('/api/admin/gestion-restringida')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Acceso concedido/i);
    expect(res.body.user.idRol).toBe(4);
  });
});
