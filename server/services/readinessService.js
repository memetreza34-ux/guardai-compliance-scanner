const { config } = require('../config');
const { getPostgresPool } = require('../database/postgres');

async function checkDatabase() {
  if (!config.databaseUrl) return 'not_configured';
  try {
    const result = await getPostgresPool().query('select 1 as ok');
    return result.rows[0]?.ok === 1 ? 'ok' : 'error';
  } catch (error) {
    console.error(JSON.stringify({
      event: 'readiness_dependency_error',
      dependency: 'database',
      code: error?.code || null,
      message: error?.message || 'Database readiness failed',
    }));
    return 'error';
  }
}

function checkAuthConfiguration() {
  return config.supabaseUrl && config.supabasePublishableKey ? 'ok' : 'not_configured';
}

async function getReadiness() {
  const [database, auth] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkAuthConfiguration()),
  ]);

  const ready = database === 'ok' && auth === 'ok';
  return {
    ready,
    checks: {
      database,
      auth,
    },
  };
}

module.exports = {
  checkAuthConfiguration,
  checkDatabase,
  getReadiness,
};
