// server.js
'use strict';

require('dotenv').config();
const { validarEntorno } = require('./src/config/envValidator');
const { getPool } = require('./src/config/dbPool');
const { createApp } = require('./app');
const MockUsuarioRepository = require('./src/repositories/MockUsuarioRepository');
const MockCatalogoRepository = require('./src/repositories/MockCatalogoRepository');
const MockIncidenciaRepository = require('./src/repositories/MockIncidenciaRepository');
const SqlUsuarioRepository = require('./src/repositories/SqlUsuarioRepository');
const SqlIncidenciaRepository = require('./src/repositories/SqlIncidenciaRepository');

const bootstrap = async () => {
  let config;
  try {
    // 1. Validación Fail-Fast de entorno (sin exponer secretos)
    config = validarEntorno(process.env);
  } catch (error) {
    console.error('[Bootstrapper] Error de configuración:', error.message);
    process.exit(1);
  }

  let usuarioRepository;
  let catalogoRepository;
  let incidenciaRepository;

  // 2. Selección explícita de fuente de datos (Sin fallbacks silenciosos)
  if (config.dataSource === 'azure_sql') {
    try {
      console.log('[Bootstrapper] Conectando a Azure SQL...');
      const pool = await getPool();
      usuarioRepository = new SqlUsuarioRepository(pool);
      catalogoRepository = new MockCatalogoRepository();
      incidenciaRepository = new SqlIncidenciaRepository(pool);
      console.log('[Bootstrapper] Repositorios SQL conectados exitosamente a Azure SQL.');
    } catch (dbError) {
      console.error('[Bootstrapper] Fallo crítico al conectar a Azure SQL:', dbError.message);
      process.exit(1);
    }
  } else {
    // Modo Mock explícito (solo permitido fuera de producción)
    console.log('[Bootstrapper] Inicializando servidor con repositorios MOCK (Modo desarrollo).');
    usuarioRepository = new MockUsuarioRepository();
    catalogoRepository = new MockCatalogoRepository();
    incidenciaRepository = new MockIncidenciaRepository();
  }

  // 3. Ensamblado de la aplicación Express
  const app = createApp({
    usuarioRepository,
    catalogoRepository,
    incidenciaRepository,
    jwtSecret: config.jwtSecret
  });

  // 4. Inicio de escucha HTTP en todas las interfaces de red (0.0.0.0) para resolver IPv4/IPv6
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`[Server] Mejora SJR backend activo en http://127.0.0.1:${config.port} (Modo: ${config.nodeEnv})`);
  });

  return server;
};

if (require.main === module) {
  bootstrap();
}

module.exports = { bootstrap };
