const { createApp } = require('./app');
const { config } = require('./config');
const { closePostgresPool } = require('./database/postgres');

const SHUTDOWN_TIMEOUT_MS = 10000;

function startServer() {
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`GuardAI API listening on port ${config.port}`);
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ event: 'api_shutdown_started', signal }));

    const forceTimer = setTimeout(() => {
      console.error(JSON.stringify({ event: 'api_shutdown_forced', signal }));
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
    }, SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();

    server.close(async (error) => {
      clearTimeout(forceTimer);
      try {
        await closePostgresPool();
      } catch (dbError) {
        console.error(JSON.stringify({
          event: 'api_shutdown_database_error',
          message: dbError?.message || 'Database pool close failed',
        }));
        process.exitCode = 1;
      }

      if (error) {
        console.error(JSON.stringify({
          event: 'api_shutdown_server_error',
          message: error.message,
        }));
        process.exitCode = 1;
      }
    });

    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  SHUTDOWN_TIMEOUT_MS,
  startServer,
};
