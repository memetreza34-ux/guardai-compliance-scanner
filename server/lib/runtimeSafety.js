function readFlag(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

function splitOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateProductionConfiguration(env = process.env) {
  const errors = [];
  if ((env.NODE_ENV || '').toLowerCase() !== 'production') return errors;

  if (readFlag(env.ALLOW_PROTOTYPE_SCAN_ENDPOINTS)) {
    errors.push('ALLOW_PROTOTYPE_SCAN_ENDPOINTS must be false in production.');
  }
  if (readFlag(env.ALLOW_UNAUTHENTICATED_AI_SCANS)) {
    errors.push('ALLOW_UNAUTHENTICATED_AI_SCANS must be false in production.');
  }

  if (!/^https:\/\//i.test(env.SUPABASE_URL || '')) {
    errors.push('SUPABASE_URL must be configured with HTTPS in production.');
  }

  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || '';
  if (!publishableKey) {
    errors.push('SUPABASE_PUBLISHABLE_KEY is required in production.');
  }
  if (/^(sb_secret_|.*service_role)/i.test(publishableKey)) {
    errors.push('SUPABASE_PUBLISHABLE_KEY must not contain a secret/service-role key.');
  }

  if (!/^postgres(?:ql)?:\/\//i.test(env.DATABASE_URL || '')) {
    errors.push('DATABASE_URL must be configured as a PostgreSQL URL in production.');
  }

  const origins = splitOrigins(env.CORS_ORIGIN);
  if (origins.length === 0) {
    errors.push('At least one explicit CORS_ORIGIN is required in production.');
  }
  if (origins.some((origin) => origin === '*' || !/^https:\/\//i.test(origin))) {
    errors.push('Every production CORS_ORIGIN must be an explicit HTTPS origin.');
  }

  return errors;
}

function assertSafeRuntimeConfiguration(env = process.env) {
  const errors = validateProductionConfiguration(env);
  if (errors.length > 0) {
    const error = new Error(`Unsafe GuardAI production configuration: ${errors.join(' ')}`);
    error.code = 'UNSAFE_PRODUCTION_CONFIGURATION';
    throw error;
  }
}

module.exports = {
  assertSafeRuntimeConfiguration,
  readFlag,
  splitOrigins,
  validateProductionConfiguration,
};