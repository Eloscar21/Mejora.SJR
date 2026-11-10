// tests/solicitudesPassword.test.js
'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createApp } = require('../app');
const MockUsuarioRepository = require('../src/repositories/MockUsuarioRepository');
const MockCatalogoRepository = require('../src/repositories/MockCatalogoRepository');
const MockSolicitudPasswordRepository = require('../src/repositories/MockSolicitudPasswordRepository');

describe('US-028: Flujo Asistido de Reseteo de Contraseña', () => {
  const TEST_JWT_SECRET = 'secreto_super_seguro_de_pruebas_unitarias_32_chars';
  let app;
  let usuarioRepo;
  let catalogoRepo;
  let solicitudRepo;
  let superadminToken;
  let adminJapamToken;
  let trabajadorToken;

  beforeEach(() => {
    usuarioRepo = new MockUsuarioRepository();
    catalogoRepo = new MockCatalogoRepository();
    solicitudRepo = new MockSolicitudPasswordRepository(usuarioRepo);

    app = createApp({
      usuarioRepository: usuarioRepo,
      catalogoRepository: catalogoRepo,
      solicitudPasswordRepository: solicitudRepo,
      jwtSecret: TEST_JWT_SECRET
    });

    superadminToken = jwt.sign(
      { idUsuario: 4, email: 'superadmin@test.com', idRol: 4, idDepartamento: null },
      TEST_JWT_SECRET
    );

    adminJapamToken = jwt.sign(
      { idUsuario: 3, email: 'admin@test.com', idRol: 3, idDepartamento: 1 },
      TEST_JWT_SECRET
    );

    trabajadorToken = jwt.sign(
      { idUsuario: 2, email: 'trabajador@test.com', idRol: 2, idDepartamento: 1 },
      TEST_JWT_SECRET
    );
  });

  describe('POST /api/solicitudes-password/solicitar (Público desde Login)', () => {
    it('debe registrar solicitud para un trabajador existente y responder mensaje genérico', async () => {
      const res = await request(app)
        .post('/api/solicitudes-password/solicitar')
        .send({ email: 'trabajador@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/la solicitud ha sido enviada al Superadministrador/i);

      // Comprobar que en el repositorio se guardó la solicitud
      expect(solicitudRepo.solicitudes.length).toBe(1);
      expect(solicitudRepo.solicitudes[0].email).toBe('trabajador@test.com');
      expect(solicitudRepo.solicitudes[0].estado).toBe('PENDIENTE');
    });

    it('responde el mismo mensaje genérico si el usuario no existe (Zero-Trust Anti-Enumeración)', async () => {
      const res = await request(app)
        .post('/api/solicitudes-password/solicitar')
        .send({ email: 'noexiste@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/la solicitud ha sido enviada al Superadministrador/i);
      // No debe haberse creado solicitud
      expect(solicitudRepo.solicitudes.length).toBe(0);
    });

    it('falla con 400 si el email no es válido', async () => {
      const res = await request(app)
        .post('/api/solicitudes-password/solicitar')
        .send({ email: 'invalido' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/correo electrónico válido/i);
    });
  });

  describe('GET /api/solicitudes-password (Bandeja Exclusiva Superadmin)', () => {
    beforeEach(async () => {
      await solicitudRepo.crearSolicitud({ idUsuario: 2, email: 'trabajador@test.com' });
    });

    it('Superadmin (Rol 4) lista exitosamente las solicitudes pendientes', async () => {
      const res = await request(app)
        .get('/api/solicitudes-password')
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].email).toBe('trabajador@test.com');
      expect(res.body.data[0].rolNombre).toBe('Trabajador');
    });

    it('rechaza a Admin (Rol 3) o Trabajador (Rol 2) con 403', async () => {
      const res = await request(app)
        .get('/api/solicitudes-password')
        .set('Authorization', `Bearer ${adminJapamToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/solicitudes-password/:id/aprobar (Aprobación y Clave Temporal)', () => {
    let idSol;

    beforeEach(async () => {
      const s = await solicitudRepo.crearSolicitud({ idUsuario: 2, email: 'trabajador@test.com' });
      idSol = s.idSolicitud;
    });

    it('Superadmin aprueba la solicitud y genera contraseña temporal segura', async () => {
      const res = await request(app)
        .patch(`/api/solicitudes-password/${idSol}/aprobar`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ notas: 'Verificado por llamada telefónica' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.estado).toBe('APROBADA');
      expect(res.body.data.passwordTemporal).toBeDefined();
      expect(res.body.data.passwordTemporal.length).toBeGreaterThanOrEqual(8);

      // Comprobar que el usuario ahora tiene el hash actualizado y puede loguearse con la temporal
      const userActualizado = usuarioRepo.usuarios.find(u => u.idUsuario === 2);
      const match = await bcrypt.compare(res.body.data.passwordTemporal, userActualizado.passwordHash);
      expect(match).toBe(true);
    });

    it('Superadmin puede asignar una contraseña provisional personalizada', async () => {
      const res = await request(app)
        .patch(`/api/solicitudes-password/${idSol}/aprobar`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ passwordProvisional: 'ClaveTemporal2026!' });

      expect(res.status).toBe(200);
      expect(res.body.data.passwordTemporal).toBe('ClaveTemporal2026!');

      const userActualizado = usuarioRepo.usuarios.find(u => u.idUsuario === 2);
      const match = await bcrypt.compare('ClaveTemporal2026!', userActualizado.passwordHash);
      expect(match).toBe(true);
    });
  });

  describe('PATCH /api/solicitudes-password/:id/rechazar (Rechazo con Motivo)', () => {
    let idSol;

    beforeEach(async () => {
      const s = await solicitudRepo.crearSolicitud({ idUsuario: 2, email: 'trabajador@test.com' });
      idSol = s.idSolicitud;
    });

    it('Superadmin rechaza una solicitud con motivo', async () => {
      const res = await request(app)
        .patch(`/api/solicitudes-password/${idSol}/rechazar`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ motivo: 'Solicitud no reconocida por el titular' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.estado).toBe('RECHAZADA');
    });

    it('falla con 400 si no se incluye motivo de rechazo', async () => {
      const res = await request(app)
        .patch(`/api/solicitudes-password/${idSol}/rechazar`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ motivo: '' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/motivo de rechazo/i);
    });
  });
});
