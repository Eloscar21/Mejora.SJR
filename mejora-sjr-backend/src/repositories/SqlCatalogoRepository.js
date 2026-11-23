// src/repositories/SqlCatalogoRepository.js
'use strict';

const sql = require('mssql');
const ICatalogoRepository = require('./ICatalogoRepository');

/**
 * SqlCatalogoRepository (US-035)
 * Implementación de ICatalogoRepository con persistencia real en Microsoft Azure SQL / SQL Server.
 * Reemplaza a MockCatalogoRepository cuando DATA_SOURCE='azure_sql'.
 */
class SqlCatalogoRepository extends ICatalogoRepository {
  /**
   * @param {import('mssql').ConnectionPool} pool - Pool de conexiones inyectado (DIP)
   */
  constructor(pool) {
    super();
    if (!pool) {
      throw new Error('ConnectionPool es requerido en SqlCatalogoRepository.');
    }
    this.pool = pool;
  }

  /**
   * Obtiene todas las dependencias oficiales desde la tabla Departamentos
   */
  async obtenerDepartamentos() {
    const request = this.pool.request();
    const query = `
      SELECT
        IdDepartamento AS idDepartamento,
        Nombre AS nombre
      FROM Departamentos
      ORDER BY IdDepartamento ASC;
    `;
    const result = await request.query(query);
    return result.recordset.map(row => ({
      idDepartamento: Number(row.idDepartamento),
      nombre: String(row.nombre).trim()
    }));
  }

  /**
   * Obtiene las categorías desde la tabla Categorias resolviendo la FK hacia Departamentos
   * @param {number|null} [idDepartamento]
   */
  async obtenerCategorias(idDepartamento = null) {
    const request = this.pool.request();
    let query = `
      SELECT
        c.IdCategoria AS idCategoria,
        c.Nombre AS nombre,
        c.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre
      FROM Categorias c
      INNER JOIN Departamentos d ON c.IdDepartamento = d.IdDepartamento
      WHERE 1 = 1
    `;

    if (idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== '') {
      request.input('IdDepartamento', sql.Int, Number(idDepartamento));
      query += ` AND c.IdDepartamento = @IdDepartamento`;
    }

    query += ` ORDER BY c.IdCategoria ASC;`;

    const result = await request.query(query);
    return result.recordset.map(row => ({
      idCategoria: Number(row.idCategoria),
      nombre: String(row.nombre).trim(),
      idDepartamento: Number(row.idDepartamento),
      departamentoNombre: String(row.departamentoNombre).trim()
    }));
  }

  /**
   * Crea físicamente una nueva categoría en la tabla Categorias de Azure SQL (US-035).
   * Soporta tanto esquemas donde IdCategoria es INT PRIMARY KEY (schema.sql) como IDENTITY(1,1).
   */
  async crearCategoria({ nombre, idDepartamento }) {
    const request = this.pool.request();
    request.input('Nombre', sql.VarChar(100), nombre.trim());
    request.input('IdDepartamento', sql.Int, Number(idDepartamento));

    const query = `
      DECLARE @Inserted TABLE (
        idCategoria INT,
        nombre VARCHAR(100),
        idDepartamento INT
      );

      IF COLUMNPROPERTY(OBJECT_ID('Categorias'), 'IdCategoria', 'IsIdentity') = 1
      BEGIN
        INSERT INTO Categorias (Nombre, IdDepartamento)
        OUTPUT
          INSERTED.IdCategoria,
          INSERTED.Nombre,
          INSERTED.IdDepartamento
        INTO @Inserted (idCategoria, nombre, idDepartamento)
        VALUES (@Nombre, @IdDepartamento);
      END
      ELSE
      BEGIN
        DECLARE @NextId INT;
        SELECT @NextId = ISNULL(MAX(IdCategoria), 0) + 1
        FROM Categorias WITH (UPDLOCK, HOLDLOCK);

        INSERT INTO Categorias (IdCategoria, Nombre, IdDepartamento)
        OUTPUT
          INSERTED.IdCategoria,
          INSERTED.Nombre,
          INSERTED.IdDepartamento
        INTO @Inserted (idCategoria, nombre, idDepartamento)
        VALUES (@NextId, @Nombre, @IdDepartamento);
      END

      SELECT
        i.idCategoria AS idCategoria,
        i.nombre AS nombre,
        i.idDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre
      FROM @Inserted i
      INNER JOIN Departamentos d ON i.idDepartamento = d.IdDepartamento;
    `;

    const result = await request.query(query);
    const row = result.recordset[0];
    if (!row) return null;

    return {
      idCategoria: Number(row.idCategoria),
      nombre: String(row.nombre).trim(),
      idDepartamento: Number(row.idDepartamento),
      departamentoNombre: String(row.departamentoNombre).trim()
    };
  }

  /**
   * Actualiza una categoría existente en la tabla Categorias de Azure SQL (US-035).
   */
  async actualizarCategoria(idCategoria, { nombre, idDepartamento }) {
    const request = this.pool.request();
    request.input('IdCategoria', sql.Int, Number(idCategoria));
    request.input('Nombre', sql.VarChar(100), nombre.trim());
    request.input('IdDepartamento', sql.Int, Number(idDepartamento));

    const query = `
      UPDATE Categorias
      SET
        Nombre = @Nombre,
        IdDepartamento = @IdDepartamento
      WHERE IdCategoria = @IdCategoria;

      SELECT
        c.IdCategoria AS idCategoria,
        c.Nombre AS nombre,
        c.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre
      FROM Categorias c
      INNER JOIN Departamentos d ON c.IdDepartamento = d.IdDepartamento
      WHERE c.IdCategoria = @IdCategoria;
    `;

    const result = await request.query(query);
    const row = result.recordset[0];
    if (!row) return null;

    return {
      idCategoria: Number(row.idCategoria),
      nombre: String(row.nombre).trim(),
      idDepartamento: Number(row.idDepartamento),
      departamentoNombre: String(row.departamentoNombre).trim()
    };
  }
}

module.exports = SqlCatalogoRepository;
