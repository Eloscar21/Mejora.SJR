// testConnection.js
'use strict';
const { getPool } = require('./src/config/dbPool');

(async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT GETDATE() AS now');
    console.log('✅ Conexión exitosa. Hora del servidor SQL:', result.recordset[0].now);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al conectar a la base de datos:', err.message);
    process.exit(1);
  }
})();
