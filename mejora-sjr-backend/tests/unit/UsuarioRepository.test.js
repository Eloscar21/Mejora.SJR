'use strict';
const UsuarioRepository = require('../../src/repositories/UsuarioRepository');
const IUsuarioRepository = require('../../src/repositories/IUsuarioRepository');
const EmailDuplicadoError = require('../../src/errors/EmailDuplicadoError');

describe('UsuarioRepository', () => {
  let repository;
  let mockPool;
  let mockRequest;
  let mockSql;

  beforeEach(() => {
    mockRequest = {
      input: jest.fn().mockReturnThis(),
      query: jest.fn()
    };

    mockPool = {
      request: jest.fn().mockReturnValue(mockRequest)
    };

    mockSql = {
      VarChar: jest.fn((len) => `VarChar(${len})`),
      Int: 'Int'
    };

    repository = new UsuarioRepository({
      getPool: jest.fn().mockResolvedValue(mockPool),
      sql: mockSql
    });
  });

  it('debe heredar de IUsuarioRepository', () => {
    expect(repository).toBeInstanceOf(IUsuarioRepository);
  });

  describe('buscarPorEmail', () => {
    it('debe devolver el usuario con parámetros tipados si existe en la base de datos', async () => {
      const usuarioEncontrado = { idUsuario: 1, email: 'isaac@ejemplo.com' };
      mockRequest.query.mockResolvedValue({ recordset: [usuarioEncontrado] });

      const resultado = await repository.buscarPorEmail('isaac@ejemplo.com');

      expect(mockRequest.input).toHaveBeenCalledWith('email', mockSql.VarChar(150), 'isaac@ejemplo.com');
      expect(mockRequest.query).toHaveBeenCalledWith(expect.stringContaining('WHERE Email = @email'));
      expect(resultado).toEqual(usuarioEncontrado);
    });

    it('debe devolver null estrictamente si el correo no existe en la base de datos', async () => {
      mockRequest.query.mockResolvedValue({ recordset: [] });

      const resultado = await repository.buscarPorEmail('noexiste@ejemplo.com');

      expect(resultado).toBeNull();
    });
  });

  describe('crear', () => {
    const usuarioParaCrear = {
      nombre: 'Isaac Ochoa',
      email: 'isaac@ejemplo.com',
      passwordHash: '$2b$10$hashSeguro',
      idRol: 1,
      idDepartamento: null
    };

    it('debe insertar con parámetros tipados y devolver la proyección segura mediante OUTPUT', async () => {
      const proyeccionSegura = {
        IdUsuario: 10,
        Nombre: 'Isaac Ochoa',
        Email: 'isaac@ejemplo.com',
        IdRol: 1,
        IdDepartamento: null
      };
      mockRequest.query.mockResolvedValue({ recordset: [proyeccionSegura] });

      const resultado = await repository.crear(usuarioParaCrear);

      expect(mockRequest.input).toHaveBeenCalledWith('nombre', mockSql.VarChar(150), 'Isaac Ochoa');
      expect(mockRequest.input).toHaveBeenCalledWith('email', mockSql.VarChar(150), 'isaac@ejemplo.com');
      expect(mockRequest.input).toHaveBeenCalledWith('passwordHash', mockSql.VarChar(255), '$2b$10$hashSeguro');
      expect(mockRequest.input).toHaveBeenCalledWith('idRol', mockSql.Int, 1);
      expect(mockRequest.input).toHaveBeenCalledWith('idDepartamento', mockSql.Int, null);

      expect(mockRequest.query).toHaveBeenCalledWith(expect.stringContaining('OUTPUT INSERTED.'));
      expect(resultado).toEqual(proyeccionSegura);
      expect(resultado.PasswordHash).toBeUndefined();
    });

    it.each([2627, 2601])(
      'debe capturar el error %i de SQL Server y traducirlo a EmailDuplicadoError',
      async (codigoError) => {
        const sqlError = new Error('Violation of UNIQUE KEY constraint');
        sqlError.number = codigoError;
        mockRequest.query.mockRejectedValue(sqlError);

        await expect(repository.crear(usuarioParaCrear)).rejects.toBeInstanceOf(EmailDuplicadoError);
      }
    );

    it('debe relanzar cualquier otro error de SQL sin modificarlo', async () => {
      const otroError = new Error('Conexión perdida o timeout');
      otroError.number = 1205; // Deadlock
      mockRequest.query.mockRejectedValue(otroError);

      await expect(repository.crear(usuarioParaCrear)).rejects.toBe(otroError);
    });
  });
});
