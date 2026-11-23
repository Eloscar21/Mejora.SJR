// src/repositories/SqlCatalogoRepository.js
'use strict';

const sql = require('mssql');
const ICatalogoRepository = require('./ICatalogoRepository');

/**
 * SqlCatalogoRepository (US-035 / US-037)
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
    this._columnaActivoAsegurada = false;
  }

  async _asegurarColumnaActivo() {
    if (this._columnaActivoAsegurada) return;
    try {
      await this.pool.request().batch(`
        IF COL_LENGTH('Categorias', 'Activo') IS NULL
        BEGIN
          ALTER TABLE Categorias ADD Activo BIT NOT NULL CONSTRAINT DF_Categorias_Activo DEFAULT 1;
        END
      `);
      this._columnaActivoAsegurada = true;
    } catch {
      this._columnaActivoAsegurada = false;
    }
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
   * @param {boolean} [soloActivas=false]
   */
  async obtenerCategorias(idDepartamento = null, soloActivas = false) {
    await this._asegurarColumnaActivo();
    const request = this.pool.request();
    let query = `
      SELECT
        c.IdCategoria AS idCategoria,
        c.Nombre AS nombre,
        c.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        CASE WHEN COL_LENGTH('Categorias', 'Activo') IS NOT NULL THEN c.Activo ELSE 1 END AS activo
      FROM Categorias c
      INNER JOIN Departamentos d ON c.IdDepartamento = d.IdDepartamento
      WHERE 1 = 1
    `;

    if (idDepartamento !== null && idDepartamento !== undefined && idDepartamento !== '') {
      request.input('IdDepartamento', sql.Int, Number(idDepartamento));
      query += ` AND c.IdDepartamento = @IdDepartamento`;
    }

    if (soloActivas) {
      query += ` AND (COL_LENGTH('Categorias', 'Activo') IS NULL OR c.Activo = 1)`;
    }

    query += ` ORDER BY c.IdCategoria ASC;`;

    const result = await request.query(query);
    return result.recordset.map(row => ({
      idCategoria: Number(row.idCategoria),
      nombre: String(row.nombre).trim(),
      idDepartamento: Number(row.idDepartamento),
      departamentoNombre: String(row.departamentoNombre).trim(),
      activo: row.activo === null || row.activo === undefined ? true : Boolean(row.activo)
    }));
  }

  /**
   * Crea físicamente una nueva categoría en la tabla Categorias de Azure SQL (US-035).
   * Soporta tanto esquemas donde IdCategoria es INT PRIMARY KEY (schema.sql) como IDENTITY(1,1).
   */
  async crearCategoria({ nombre, idDepartamento, activo = true }) {
    await this._asegurarColumnaActivo();
    const request = this.pool.request();
    request.input('Nombre', sql.VarChar(100), nombre.trim());
    request.input('IdDepartamento', sql.Int, Number(idDepartamento));
    request.input('Activo', sql.Bit, activo ? 1 : 0);

    const query = `
      DECLARE @GeneradoId INT;
      DECLARE @EsIdentity INT = COLUMNPROPERTY(OBJECT_ID('Categorias'), 'IdCategoria', 'IsIdentity');

      IF @EsIdentity = 1
      BEGIN
        IF COL_LENGTH('Categorias', 'Activo') IS NOT NULL
        BEGIN
          INSERT INTO Categorias (Nombre, IdDepartamento, Activo)
          VALUES (@Nombre, @IdDepartamento, @Activo);
        END
        ELSE
        BEGIN
          INSERT INTO Categorias (Nombre, IdDepartamento)
          VALUES (@Nombre, @IdDepartamento);
        END
        SET @GeneradoId = SCOPE_IDENTITY();
      END
      ELSE
      BEGIN
        SELECT @GeneradoId = ISNULL(MAX(IdCategoria), 0) + 1 FROM Categorias;
        IF COL_LENGTH('Categorias', 'Activo') IS NOT NULL
        BEGIN
          INSERT INTO Categorias (IdCategoria, Nombre, IdDepartamento, Activo)
          VALUES (@GeneradoId, @Nombre, @IdDepartamento, @Activo);
        END
        ELSE
        BEGIN
          INSERT INTO Categorias (IdCategoria, Nombre, IdDepartamento)
          VALUES (@GeneradoId, @Nombre, @IdDepartamento);
        END
      END

      SELECT
        c.IdCategoria AS idCategoria,
        c.Nombre AS nombre,
        c.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        CASE WHEN COL_LENGTH('Categorias', 'Activo') IS NOT NULL THEN c.Activo ELSE 1 END AS activo
      FROM Categorias c
      INNER JOIN Departamentos d ON c.IdDepartamento = d.IdDepartamento
      WHERE c.IdCategoria = @GeneradoId;
    `;

    const result = await request.query(query);
    const row = result.recordset[0];
    if (!row) return null;

    return {
      idCategoria: Number(row.idCategoria),
      nombre: String(row.nombre).trim(),
      idDepartamento: Number(row.idDepartamento),
      departamentoNombre: String(row.departamentoNombre).trim(),
      activo: row.activo === null || row.activo === undefined ? true : Boolean(row.activo)
    };
  }

  /**
   * Actualiza una categoría existente en la tabla Categorias de Azure SQL (US-035).
   */
  async actualizarCategoria(idCategoria, { nombre, idDepartamento, activo }) {
    await this._asegurarColumnaActivo();
    const request = this.pool.request();
    request.input('IdCategoria', sql.Int, Number(idCategoria));
    request.input('Nombre', sql.VarChar(100), nombre ? nombre.trim() : '');
    request.input('IdDepartamento', sql.Int, Number(idDepartamento));
    const tieneActivo = activo !== undefined && activo !== null;
    if (tieneActivo) {
      request.input('Activo', sql.Bit, activo ? 1 : 0);
    }

    const query = `
      IF COL_LENGTH('Categorias', 'Activo') IS NOT NULL AND ${tieneActivo ? '1=1' : '1=0'}
      BEGIN
        UPDATE Categorias
        SET
          Nombre = CASE WHEN @Nombre <> '' THEN @Nombre ELSE Nombre END,
          IdDepartamento = @IdDepartamento,
          Activo = @Activo
        WHERE IdCategoria = @IdCategoria;
      END
      ELSE
      BEGIN
        UPDATE Categorias
        SET
          Nombre = CASE WHEN @Nombre <> '' THEN @Nombre ELSE Nombre END,
          IdDepartamento = @IdDepartamento
        WHERE IdCategoria = @IdCategoria;
      END

      SELECT
        c.IdCategoria AS idCategoria,
        c.Nombre AS nombre,
        c.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        CASE WHEN COL_LENGTH('Categorias', 'Activo') IS NOT NULL THEN c.Activo ELSE 1 END AS activo
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
      departamentoNombre: String(row.departamentoNombre).trim(),
      activo: row.activo === null || row.activo === undefined ? true : Boolean(row.activo)
    };
  }

  /**
   * Activa o desactiva una categoría existente en la tabla Categorias de Azure SQL (US-037).
   */
  async cambiarEstadoCategoria(idCategoria, activo) {
    await this._asegurarColumnaActivo();
    const request = this.pool.request();
    request.input('IdCategoria', sql.Int, Number(idCategoria));
    request.input('Activo', sql.Bit, activo ? 1 : 0);

    const query = `
      IF COL_LENGTH('Categorias', 'Activo') IS NOT NULL
      BEGIN
        UPDATE Categorias
        SET Activo = @Activo
        WHERE IdCategoria = @IdCategoria;
      END

      SELECT
        c.IdCategoria AS idCategoria,
        c.Nombre AS nombre,
        c.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        CASE WHEN COL_LENGTH('Categorias', 'Activo') IS NOT NULL THEN c.Activo ELSE 1 END AS activo
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
      departamentoNombre: String(row.departamentoNombre).trim(),
      activo: row.activo === null || row.activo === undefined ? true : Boolean(row.activo)
    };
  }
}

module.exports = SqlCatalogoRepository;
