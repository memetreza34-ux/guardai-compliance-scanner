const { Pool } = require('pg');
const { config } = require('../config');
const { HttpError } = require('../lib/httpError');

let pool = null;

function assertDatabaseConfigured() {
  if (!config.databaseUrl) {
    throw new HttpError(503, 'GuardAI database is not configured yet.', 'DATABASE_NOT_CONFIGURED');
  }

  if (!Number.isInteger(config.databasePoolMax) || config.databasePoolMax < 1 || config.databasePoolMax > 50) {
    throw new HttpError(503, 'GuardAI database pool configuration is invalid.', 'DATABASE_CONFIG_INVALID');
  }
}

function createPostgresPool() {
  assertDatabaseConfigured();

  return new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    allowExitOnIdle: true,
    application_name: 'guardai-api',
  });
}

function getPostgresPool() {
  if (!pool) {
    pool = createPostgresPool();
    pool.on('error', (error) => {
      console.error('[Database] Unexpected idle client error:', error);
    });
  }

  return pool;
}

async function closePostgresPool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
}

module.exports = {
  assertDatabaseConfigured,
  closePostgresPool,
  createPostgresPool,
  getPostgresPool,
};
