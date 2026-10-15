'use strict';
const RegistroService = require('../../src/services/RegistroService');
const EmailDuplicadoError = require('../../src/errors/EmailDuplicadoError');
const ValidacionError = require('../../src/errors/ValidacionError');

describe('RegistroService', () => {
  let servicio;
  let mockRepository;
  let mockHasher;

  beforeEach(() => {
    // Espía y Stub para el repositorio
    mockRepository = {
      crear: jest.fn().mockResolvedValue({ idUsuario: 100 }),
      buscarPorEmail: jest.fn().mockResolvedValue(null)
    };

    // Doble vacío para el hasher por ahora
    mockHasher = {
      hash: jest.fn()
    };

    servicio = new RegistroService({
      usuarioRepository: mockRepository,
      hasher: mockHasher
    });
  });

  it('debe transformar el payload y delegar al repositorio con reglas de negocio inmutables', async () => {
    // Arrange: Payload malicioso y contraseña válida para no fallar por complejidad luego
    const payload = {
      nombre: 'Isaac',
      email: 'isaac@ejemplo.com',
      password: 'PasswordValido123!',
      idRol: 4,             // Intento de escalada
      idDepartamento: 2     // Intento de asignación
    };

    // Act
    await servicio.registrar(payload);

    // Assert
    expect(mockRepository.crear).toHaveBeenCalledTimes(1);

    // Verificamos qué se le pasó al mock
    const argumentoLlamada = mockRepository.crear.mock.calls[0][0];

    // Reglas de negocio: Literal 1 y null
    expect(argumentoLlamada.idRol).toBe(1);
    expect(argumentoLlamada.idDepartamento).toBeNull();

    // Descarte de campos extra y estructura
    expect(argumentoLlamada.nombre).toBe('Isaac');
    expect(argumentoLlamada.email).toBe('isaac@ejemplo.com');
    expect(argumentoLlamada.password).toBeUndefined(); // El texto plano original no debe ir bajo esa llave

    // Inmutabilidad
    expect(Object.isFrozen(argumentoLlamada)).toBe(true);
  });

  it('debe hashear la contraseña delegando la operación al hasher', async () => {
    // Arrange
    const payload = {
      nombre: 'Isaac',
      email: 'isaac@ejemplo.com',
      password: 'PasswordValido123!'
    };
    const hashEsperado = 'hash_bcrypt_simulado_8x$';

    // Configuramos el stub para este test específico
    mockHasher.hash.mockResolvedValue(hashEsperado);

    // Act
    await servicio.registrar(payload);

    // Assert
    // 1. Verificamos la interacción con la dependencia (que se llame bien)
    expect(mockHasher.hash).toHaveBeenCalledTimes(1);
    expect(mockHasher.hash).toHaveBeenCalledWith('PasswordValido123!');

    // 2. Verificamos la salida hacia el repositorio (que no use el fake)
    const argumentoLlamada = mockRepository.crear.mock.calls[0][0];
    expect(argumentoLlamada.passwordHash).toBe(hashEsperado);
    expect(argumentoLlamada.password).toBeUndefined();
  });

  it('debe rechazar inmediatamente si el correo ya existe, sin consumir CPU en el hasher', async () => {
    // Arrange
    const payload = { nombre: 'Isaac', email: 'duplicado@ejemplo.com', password: 'Password123!' };

    // Simulamos que el repositorio encuentra el correo (retorna un objeto, no null)
    mockRepository.buscarPorEmail.mockResolvedValue({ idUsuario: 50, email: 'duplicado@ejemplo.com' });

    // Act & Assert
    await expect(servicio.registrar(payload)).rejects.toBeInstanceOf(EmailDuplicadoError);

    // Cortocircuito: protege la CPU
    expect(mockHasher.hash).not.toHaveBeenCalled();

    // Y no intenta persistir
    expect(mockRepository.crear).not.toHaveBeenCalled();
  });

  it('debe propagar el EmailDuplicadoError si ocurre una condición de carrera en la base de datos', async () => {
    // Arrange
    const payload = { nombre: 'Isaac', email: 'carrera@ejemplo.com', password: 'Password123!' };
    const errorDominio = new EmailDuplicadoError('El correo ya está registrado');

    // 1. Simular que NO existe en la verificación inicial (la carrera empieza)
    mockRepository.buscarPorEmail.mockResolvedValue(null);
    mockHasher.hash.mockResolvedValue('hash123');

    // 2. Simular que el motor SQL rechazó el INSERT por UNIQUE y el repo tradujo el error
    mockRepository.crear.mockRejectedValue(errorDominio);

    // Act & Assert
    // Identidad exacta: detecta un catch que lo envuelva o lo recree
    await expect(servicio.registrar(payload)).rejects.toBe(errorDominio);
  });

  it.each([
    ['es menor a 8 caracteres', '1234567', /entre 8 y 64/],
    ['es mayor a 64 caracteres', 'a'.repeat(65), /entre 8 y 64/],
    ['excede 72 bytes en UTF-8 aunque tenga pocos caracteres', 'ñ'.repeat(40), /tamaño seguro/],
    ['mide 73 bytes (un byte sobre el límite) con menos de 64 caracteres', 'ñ'.repeat(36) + 'a', /tamaño seguro/],
    ['no es una cadena de texto', 12345678, /debe ser un texto/],
    ['es null', null, /debe ser un texto/],
    ['es undefined', undefined, /debe ser un texto/],
    ['es un array', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], /debe ser un texto/],
    ['es un objeto', { toString: () => 'PasswordValido123!' }, /debe ser un texto/]
  ])('debe rechazar con ValidacionError si la contraseña %s', async (_, passwordInvalido, mensaje) => {
    const payload = { nombre: 'Isaac', email: 'test@ejemplo.com', password: passwordInvalido };
    const resultado = servicio.registrar(payload);

    await expect(resultado).rejects.toBeInstanceOf(ValidacionError);
    await expect(resultado).rejects.toThrow(mensaje);

    // Cortocircuito total (fail-fast local)
    expect(mockRepository.buscarPorEmail).not.toHaveBeenCalled();
    expect(mockHasher.hash).not.toHaveBeenCalled();
    expect(mockRepository.crear).not.toHaveBeenCalled();
  });

  it.each([
    ['datos es undefined', undefined],
    ['datos es null', null],
    ['datos es un texto', 'no soy un objeto']
  ])('debe rechazar con ValidacionError si %s', async (_, datosInvalidos) => {
    const resultado = servicio.registrar(datosInvalidos);

    await expect(resultado).rejects.toBeInstanceOf(ValidacionError);
    await expect(resultado).rejects.toThrow(/datos de registro/);

    expect(mockRepository.buscarPorEmail).not.toHaveBeenCalled();
    expect(mockHasher.hash).not.toHaveBeenCalled();
    expect(mockRepository.crear).not.toHaveBeenCalled();
  });

  const PW = 'PasswordValido123!';
  it.each([
    ['nombre no es texto', { nombre: 123, email: 'test@ejemplo.com', password: PW }, /nombre.*obligatorio/],
    ['nombre es null', { nombre: null, email: 'test@ejemplo.com', password: PW }, /nombre.*obligatorio/],
    ['nombre está vacío', { nombre: '', email: 'test@ejemplo.com', password: PW }, /nombre.*obligatorio/],
    ['nombre solo tiene espacios', { nombre: '    ', email: 'test@ejemplo.com', password: PW }, /nombre.*obligatorio/],
    ['nombre excede 150 caracteres', { nombre: 'N'.repeat(151), email: 'test@ejemplo.com', password: PW }, /nombre.*150/],
    ['email no es texto', { nombre: 'Isaac', email: ['a@b.com'], password: PW }, /correo.*obligatorio/],
    ['email es undefined', { nombre: 'Isaac', email: undefined, password: PW }, /correo.*obligatorio/],
    ['email está vacío', { nombre: 'Isaac', email: '', password: PW }, /correo.*obligatorio/],
    ['email excede 150 caracteres', { nombre: 'Isaac', email: 'a'.repeat(145) + '@x.com', password: PW }, /correo.*150/],
    ['email no tiene arroba', { nombre: 'Isaac', email: 'sin-arroba', password: PW }, /formato/],
    ['email no tiene dominio con punto', { nombre: 'Isaac', email: 'a@b', password: PW }, /formato/],
    ['email contiene espacios internos', { nombre: 'Isaac', email: 'con espacio@x.com', password: PW }, /formato/]
  ])('debe rechazar con ValidacionError si %s', async (_, payloadInvalido, mensaje) => {
    const resultado = servicio.registrar(payloadInvalido);

    await expect(resultado).rejects.toBeInstanceOf(ValidacionError);
    await expect(resultado).rejects.toThrow(mensaje);

    // Fail-fast: ninguna E/S ni CPU
    expect(mockRepository.buscarPorEmail).not.toHaveBeenCalled();
    expect(mockHasher.hash).not.toHaveBeenCalled();
    expect(mockRepository.crear).not.toHaveBeenCalled();
  });

  it('debe normalizar nombre y email, pero no alterar la contraseña', async () => {
    const payload = {
      nombre: ' Isaac ',
      email: '  IsAaC@Ejemplo.com  ',
      password: '  clave con espacios  '
    };
    mockHasher.hash.mockResolvedValue('hash123');

    await servicio.registrar(payload);

    // La búsqueda de duplicados usa el correo ya normalizado
    expect(mockRepository.buscarPorEmail).toHaveBeenCalledWith('isaac@ejemplo.com');

    // Lo que se persiste está normalizado
    const argumentoLlamada = mockRepository.crear.mock.calls[0][0];
    expect(argumentoLlamada.email).toBe('isaac@ejemplo.com');
    expect(argumentoLlamada.nombre).toBe('Isaac');

    // La contraseña NUNCA se recorta: se hashea tal cual la escribió el ciudadano
    expect(mockHasher.hash).toHaveBeenCalledWith('  clave con espacios  ');
  });

  it.each([
    ['8 caracteres exactos', 'a'.repeat(8)],
    ['64 caracteres exactos', 'a'.repeat(64)],
    ['72 bytes exactos en UTF-8 con caracteres especiales', 'ñ'.repeat(36)]
  ])('debe aceptar una contraseña de %s', async (_, passwordLimite) => {
    mockHasher.hash.mockResolvedValue('hash123');

    await servicio.registrar({ nombre: 'Isaac', email: 'limite@ejemplo.com', password: passwordLimite });

    expect(mockHasher.hash).toHaveBeenCalledWith(passwordLimite);
    expect(mockRepository.crear).toHaveBeenCalledTimes(1);
  });
});
