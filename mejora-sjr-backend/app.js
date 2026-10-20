// app.js
'use strict';

require('dotenv').config();
const express = require('express');
const { getPool } = require('./src/config/dbPool');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor Mejora SJR activo.' });
});

// Función de arranque: conecta la BD y levanta el servidor
const bootstrap = async () => {
  try {
    await getPool();
    app.listen(PORT, () => {
      console.log(`[Server] Corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Error crítico al iniciar:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  bootstrap();
}

module.exports = app;
