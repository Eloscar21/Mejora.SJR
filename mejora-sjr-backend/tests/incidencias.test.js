// tests/incidencias.test.js
'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../app');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');
const MockIncidenciaRepository = require('../src/repositories/MockIncidenciaRepository');

describe('US-023: API de Creación y Persistencia de Incidencia Ciudadana', () => {
  const TEST_JWT_SECRET = 'secreto_super_seguro_de_pruebas_unitarias_32_chars';
  let app;
  let usuarioRepo;
  let catalogoRepo;
  let incidenciaRepo;
  let ciudadanoToken;
  let trabajadorToken;
  let superadminToken;

  beforeEach(() => {
    usuarioRepo = new MockUsuarioRepository();
    catalogoRepo = new MockCatalogoRepository();
    incidenciaRepo = new MockIncidenciaRepository();

    app = createApp({
      usuarioRepository: usuarioRepo,
      catalogoRepository: catalogoRepo,
      incidenciaRepository: incidenciaRepo,
      jwtSecret: TEST_JWT_SECRET
    });

    // Tokens
    ciudadanoToken = jwt.sign(
      { idUsuario: 1, email: 'ciudadano@test.com', idRol: 1, idDepartamento: null },
      TEST_JWT_SECRET
    );

    trabajadorToken = jwt.sign(
      { idUsuario: 2, email: 'trabajador@test.com', idRol: 2, idDepartamento: 1 },
      TEST_JWT_SECRET
    );

    superadminToken = jwt.sign(
      { idUsuario: 4, email: 'superadmin@test.com', idRol: 4, idDepartamento: null },
      TEST_JWT_SECRET
    );
  });

  describe('Control de Acceso y RBAC (401 / 403)', () => {
    it('debe rechazar solicitudes anónimas sin token con 401', async () => {
      const res = await request(app)
        .post('/api/incidencias')
        .send({
          descripcion: 'Fuga de agua considerable en calle Hidalgo',
          latitud: 20.3888,
          longitud: -99.9961,
          idCategoria: 1
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Token no proporcionado/i);
    });

    it('debe rechazar con 403 si un Trabajador (Rol 2) o Superadmin (Rol 4) intenta crear incidencia ciudadana', async () => {
      const res = await request(app)
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${trabajadorToken}`)
        .send({
          descripcion: 'Fuga de agua considerable en calle Hidalgo',
          latitud: 20.3888,
          longitud: -99.9961,
          idCategoria: 1
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Únicamente los ciudadanos pueden crear reportes/i);
    });
  });

  describe('Validación de Datos de Entrada (400 Bad Request)', () => {
    it('debe rechazar si la descripción es menor a 10 caracteres', async () => {
      const res = await request(app)
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${ciudadanoToken}`)
        .send({
          descripcion: 'Corta',
          latitud: 20.3888,
          longitud: -99.9961,
          idCategoria: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/al menos 10 caracteres/i);
    });

    it('debe rechazar si la categoría no es válida o no existe', async () => {
      const res = await request(app)
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${ciudadanoToken}`)
        .send({
          descripcion: 'Fuga de agua considerable en calle Hidalgo',
          latitud: 20.3888,
          longitud: -99.9961,
          idCategoria: 9999
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no existe en el catálogo/i);
    });

    it('debe rechazar coordenadas fuera del municipio de San Juan del Río', async () => {
      const res = await request(app)
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${ciudadanoToken}`)
        .send({
          descripcion: 'Fuga de agua considerable en otra ciudad',
          latitud: 19.4326, // Ciudad de México
          longitud: -99.1332,
          idCategoria: 1
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/fuera del municipio de San Juan del Río/i);
    });
  });

  describe('Creación Exitosa de Incidencia (201 Created)', () => {
    it('Ciudadano crea exitosamente una incidencia con coordenadas y categoría válida', async () => {
      const payload = {
        descripcion: 'Fuga de agua potable abundante frente al parque Benito Juárez',
        latitud: 20.38888,
        longitud: -99.99610,
        idCategoria: 1
      };

      const res = await request(app)
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${ciudadanoToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/registrado exitosamente/i);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.idIncidencia).toBeDefined();
      expect(res.body.data.idUsuario).toBe(1); // Extraído del token JWT (Zero-Trust)
      expect(res.body.data.idEstado).toBe(1); // 1 = Recibido por defecto
      expect(res.body.data.idCategoria).toBe(1);
      expect(res.body.data.latitud).toBe(payload.latitud);
      expect(res.body.data.longitud).toBe(payload.longitud);
    });

    it('Ciudadano crea exitosamente una incidencia adjuntando URL de fotografía de evidencia inicial', async () => {
      const payload = {
        descripcion: 'Bache profundo en avenida Paseo Central esq. Río Moctezuma',
        latitud: 20.3950,
        longitud: -100.0050,
        idCategoria: 4, // Bacheo
        fotoUrl: 'https://storage.mejorasjr.gob.mx/evidencias/bache123.jpg'
      };

      const res = await request(app)
        .post('/api/incidencias')
        .set('Authorization', `Bearer ${ciudadanoToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.idIncidencia).toBeDefined();
      expect(res.body.data.evidencias).toBeDefined();
      expect(res.body.data.evidencias.length).toBe(1);
      expect(res.body.data.evidencias[0].tipoEvidencia).toBe('INICIAL');
      expect(res.body.data.evidencias[0].fotoUrl).toBe(payload.fotoUrl);
    });
  });
});
