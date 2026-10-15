// app.js
// Punto de entrada del servidor. Responsabilidad Única (SRP):
// Solo ensambla el servidor Express y levanta el pool de BD.
// No contiene lógica de negocio ni consultas a BD.

'use strict';

require('dotenv').config();
const express = require('express');
const { getPool } = require('./src/config/dbPool');
const { authRoutes } = require('./src/routes/authRoutes');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globales
app.use(express.json());

// Health check: verifica que el servidor está vivo
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor Mejora SJR activo.' });
});

// Rutas de la API
app.use('/api/auth', authRoutes);

// Manejador global de errores (siempre al final de las rutas)
app.use(errorHandler);

// Función de arranque: primero conecta la BD, luego levanta el servidor
const bootstrap = async () => {
  try {
    await getPool(); // Establece el pool de conexiones con Azure SQL
    app.listen(PORT, () => {
      console.log(`[Server] Corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Error crítico al iniciar:', error.message);
    process.exit(1); // Si la BD falla, el proceso muere. No levantamos un servidor sin BD.
  }
};

if (require.main === module) {
  bootstrap();
}

module.exports = app;
