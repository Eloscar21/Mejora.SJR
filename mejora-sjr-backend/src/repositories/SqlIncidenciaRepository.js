// src/repositories/SqlIncidenciaRepository.js
'use strict';

const sql = require('mssql');
const IIncidenciaRepository = require('./IIncidenciaRepository');

/**
 * Implementación de IIncidenciaRepository para Microsoft Azure SQL Server / SQL Server
 * Conforme a US-023: Persistencia de incidencias y evidencias iniciales con transacción atómica.
 */
class SqlIncidenciaRepository extends IIncidenciaRepository {
  /**
   * @param {sql.ConnectionPool} pool
   */
  constructor(pool) {
    super();
    if (!pool) {
      throw new Error('ConnectionPool es requerido en SqlIncidenciaRepository.');
    }
    this.pool = pool;
  }

  /**
   * Crea una incidencia y su evidencia inicial de forma atómica en una transacción
   */
  async crearIncidencia({ descripcion, latitud, longitud, idUsuario, idCategoria, fotoUrl }) {
    const transaction = new sql.Transaction(this.pool);
    await transaction.begin();

    try {
      // 1. Insertar en tabla Incidencias
      const requestIncidencia = new sql.Request(transaction);
      requestIncidencia.input('Descripcion', sql.NVarChar(sql.MAX), descripcion.trim());
      requestIncidencia.input('Latitud', sql.Decimal(10, 8), Number(latitud));
      requestIncidencia.input('Longitud', sql.Decimal(11, 8), Number(longitud));
      requestIncidencia.input('IdUsuario', sql.Int, Number(idUsuario));
      requestIncidencia.input('IdCategoria', sql.Int, Number(idCategoria));
      requestIncidencia.input('IdEstado', sql.Int, 1); // 1 = Recibido

      const queryIncidencia = `
        INSERT INTO Incidencias (
          Descripcion, Latitud, Longitud, IdUsuario, IdCategoria, IdEstado, FechaCreacion, FechaActualizacion
        )
        OUTPUT 
          INSERTED.IdIncidencia AS idIncidencia,
          INSERTED.Descripcion AS descripcion,
          INSERTED.Latitud AS latitud,
          INSERTED.Longitud AS longitud,
          INSERTED.IdUsuario AS idUsuario,
          INSERTED.IdCategoria AS idCategoria,
          INSERTED.IdEstado AS idEstado,
          INSERTED.IdTrabajadorAsignado AS idTrabajadorAsignado,
          INSERTED.FechaCreacion AS fechaCreacion,
          INSERTED.FechaActualizacion AS fechaActualizacion
        VALUES (
          @Descripcion, @Latitud, @Longitud, @IdUsuario, @IdCategoria, @IdEstado, GETDATE(), GETDATE()
        );
      `;

      const resultIncidencia = await requestIncidencia.query(queryIncidencia);
      const nuevaIncidencia = resultIncidencia.recordset[0];

      // 2. Si se proporciona fotoUrl, insertar evidencia inicial
      let evidenciaGuardada = null;
      if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim().length > 0) {
        const requestEvidencia = new sql.Request(transaction);
        requestEvidencia.input('IdIncidencia', sql.Int, nuevaIncidencia.idIncidencia);
        requestEvidencia.input('IdUsuario', sql.Int, Number(idUsuario));
        requestEvidencia.input('TipoEvidencia', sql.VarChar(20), 'INICIAL');
        requestEvidencia.input('FotoUrl', sql.VarChar(255), fotoUrl.trim());

        const queryEvidencia = `
          INSERT INTO EvidenciasIncidencia (IdIncidencia, IdUsuario, TipoEvidencia, FotoUrl, FechaSubida)
          OUTPUT 
            INSERTED.IdEvidencia AS idEvidencia,
            INSERTED.IdIncidencia AS idIncidencia,
            INSERTED.TipoEvidencia AS tipoEvidencia,
            INSERTED.FotoUrl AS fotoUrl,
            INSERTED.FechaSubida AS fechaSubida
          VALUES (@IdIncidencia, @IdUsuario, @TipoEvidencia, @FotoUrl, GETDATE());
        `;

        const resultEvidencia = await requestEvidencia.query(queryEvidencia);
        evidenciaGuardada = resultEvidencia.recordset[0];
      }

      await transaction.commit();

      return {
        ...nuevaIncidencia,
        latitud: Number(nuevaIncidencia.latitud),
        longitud: Number(nuevaIncidencia.longitud),
        evidencias: evidenciaGuardada ? [evidenciaGuardada] : []
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async buscarPorId(idIncidencia) {
    const request = this.pool.request();
    request.input('IdIncidencia', sql.Int, Number(idIncidencia));

    const query = `
      SELECT 
        i.IdIncidencia AS idIncidencia,
        i.Descripcion AS descripcion,
        i.Latitud AS latitud,
        i.Longitud AS longitud,
        i.IdUsuario AS idUsuario,
        i.IdCategoria AS idCategoria,
        c.Nombre AS categoriaNombre,
        c.IdDepartamento AS idDepartamento,
        d.Nombre AS departamentoNombre,
        i.IdEstado AS idEstado,
        e.Nombre AS estadoNombre,
        i.IdTrabajadorAsignado AS idTrabajadorAsignado,
        i.FechaCreacion AS fechaCreacion,
        i.FechaActualizacion AS fechaActualizacion
      FROM Incidencias i
      INNER JOIN Categorias c ON i.IdCategoria = c.IdCategoria
      INNER JOIN Departamentos d ON c.IdDepartamento = d.IdDepartamento
      INNER JOIN Estados e ON i.IdEstado = e.IdEstado
      WHERE i.IdIncidencia = @IdIncidencia;
    `;

    const result = await request.query(query);
    if (!result.recordset[0]) return null;

    const row = result.recordset[0];
    return {
      ...row,
      latitud: Number(row.latitud),
      longitud: Number(row.longitud)
    };
  }
}

module.exports = SqlIncidenciaRepository;
