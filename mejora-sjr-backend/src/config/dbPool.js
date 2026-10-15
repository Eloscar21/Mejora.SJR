// src/config/dbPool.js
// Responsabilidad Única (SRP): Este archivo SOLO gestiona la conexión a Azure SQL.
// Inyección de Dependencias (DIP): El pool se exporta como singleton para ser
// inyectado en los repositorios. Ningún repositorio crea su propia conexión.

'use strict';

require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: true,           // Obligatorio para Azure SQL
    trustServerCertificate: false,
  },
  pool: {
    max: 10,   // Máximo de conexiones simultáneas
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Singleton: Se crea una sola vez y se reutiliza en toda la app.
let pool;

const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(dbConfig);
    console.log('[DB] Conexión al pool de Azure SQL establecida.');
  }
  return pool;
};

module.exports = { getPool, sql };
