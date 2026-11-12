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

  /**
   * Listar incidencias con soporte para RBAC departamental y filtros opcionales (US-025)
   */
  async listarIncidencias({ idUsuario, idDepartamento, idEstado, idTrabajadorAsignado } = {}) {
    const request = this.pool.request();
    let query = `
      SELECT 
        IdIncidencia AS idIncidencia,
        Descripcion AS descripcion,
        Latitud AS latitud,
        Longitud AS longitud,
        FechaCreacion AS fechaCreacion,
        FechaActualizacion AS fechaActualizacion,
        IdEstado AS idEstado,
        Estado AS estadoNombre,
        IdCategoria AS idCategoria,
        Categoria AS categoriaNombre,
        IdDepartamento AS idDepartamento,
        Departamento AS departamentoNombre,
        IdCiudadano AS idCiudadano,
        CiudadanoNombre AS ciudadanoNombre,
        IdTrabajadorAsignado AS idTrabajadorAsignado,
        TrabajadorNombre AS trabajadorNombre,
        FotoInicialUrl AS fotoInicialUrl,
        FotoResolucionUrl AS fotoResolucionUrl
      FROM vw_IncidenciasDetalle
      WHERE 1 = 1
    `;

    if (idUsuario !== undefined && idUsuario !== null) {
      request.input('IdUsuario', sql.Int, Number(idUsuario));
      query += ` AND IdCiudadano = @IdUsuario`;
    }

    if (idDepartamento !== undefined && idDepartamento !== null) {
      request.input('IdDepartamento', sql.Int, Number(idDepartamento));
      query += ` AND IdDepartamento = @IdDepartamento`;
    }

    if (idEstado !== undefined && idEstado !== null) {
      request.input('IdEstado', sql.Int, Number(idEstado));
      query += ` AND IdEstado = @IdEstado`;
    }

    if (idTrabajadorAsignado !== undefined && idTrabajadorAsignado !== null) {
      request.input('IdTrabajadorAsignado', sql.Int, Number(idTrabajadorAsignado));
      query += ` AND IdTrabajadorAsignado = @IdTrabajadorAsignado`;
    }

    query += ` ORDER BY FechaCreacion DESC;`;

    const result = await request.query(query);
    return result.recordset.map(r => ({
      ...r,
      latitud: Number(r.latitud),
      longitud: Number(r.longitud)
    }));
  }

  /**
   * Asignar un trabajador a la incidencia (US-025)
   */
  async asignarTrabajador(idIncidencia, idTrabajador, nuevoEstado = 2) {
    const request = this.pool.request();
    request.input('IdIncidencia', sql.Int, Number(idIncidencia));
    request.input('IdTrabajador', sql.Int, Number(idTrabajador));
    request.input('NuevoEstado', sql.Int, Number(nuevoEstado));

    const query = `
      UPDATE Incidencias
      SET 
        IdTrabajadorAsignado = @IdTrabajador,
        IdEstado = @NuevoEstado,
        FechaActualizacion = GETDATE()
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
      WHERE IdIncidencia = @IdIncidencia;
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

  /**
   * Descartar incidencia como ficticia / rechazada (Estado 5) (US-025)
   */
  async descartarIncidencia(idIncidencia, motivoRechazo) {
    const request = this.pool.request();
    request.input('IdIncidencia', sql.Int, Number(idIncidencia));
    request.input('MotivoRechazo', sql.NVarChar(sql.MAX), motivoRechazo.trim());

    // Se actualiza el estado a 5 (Rechazado) y se anexa el motivo a la descripción o bitácora
    const query = `
      UPDATE Incidencias
      SET 
        IdEstado = 5,
        FechaActualizacion = GETDATE(),
        Descripcion = CONCAT(Descripcion, ' [RECHAZADO: ', @MotivoRechazo, ']')
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
      WHERE IdIncidencia = @IdIncidencia;
    `;

    const result = await request.query(query);
    if (!result.recordset[0]) return null;
    const row = result.recordset[0];
    return {
      ...row,
      latitud: Number(row.latitud),
      longitud: Number(row.longitud),
      motivoRechazo: motivoRechazo.trim()
    };
  }
}

module.exports = SqlIncidenciaRepository;

