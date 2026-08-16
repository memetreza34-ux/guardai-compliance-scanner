function readFlag(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

function splitOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function validateStripeProductionConfig(env, errors) {
  const provider = String(env.BILLING_PROVIDER || 'disabled').trim().toLowerCase();
  if (provider === 'disabled') return;
  if (provider !== 'stripe') {
    errors.push('BILLING_PROVIDER must be disabled or stripe.');
    return;
  }

  if (!/^https:\/\//i.test(env.PUBLIC_APP_URL || '')) {
    errors.push('PUBLIC_APP_URL must be an explicit HTTPS URL when Stripe billing is enabled.');
  }
  if (!/^sk_(?:test|live)_/i.test(env.STRIPE_SECRET_KEY || '')) {
    errors.push('STRIPE_SECRET_KEY must be configured when Stripe billing is enabled.');
  }
  if (!/^whsec_/i.test(env.STRIPE_WEBHOOK_SECRET || '')) {
    errors.push('STRIPE_WEBHOOK_SECRET must be configured when Stripe billing is enabled.');
  }

  let priceMap;
  try {
    priceMap = JSON.parse(env.STRIPE_PLAN_PRICE_MAP_JSON || '{}');
  } catch {
    errors.push('STRIPE_PLAN_PRICE_MAP_JSON must be valid JSON when Stripe billing is enabled.');
    return;
  }
  if (!priceMap || typeof priceMap !== 'object' || Array.isArray(priceMap) || Object.keys(priceMap).length === 0) {
    errors.push('At least one server-side Stripe plan/Price mapping is required when billing is enabled.');
    return;
  }
  for (const [plan, priceId] of Object.entries(priceMap)) {
    if (!/^[a-z0-9][a-z0-9._-]{1,79}$/.test(plan) || plan === 'free') {
      errors.push(`Invalid GuardAI Stripe plan code: ${plan}.`);
    }
    if (typeof priceId !== 'string' || !/^price_[A-Za-z0-9]+$/.test(priceId)) {
      errors.push(`Invalid Stripe Price ID configured for plan: ${plan}.`);
    }
  }
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

  validateStripeProductionConfig(env, errors);
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
  validateStripeProductionConfig,
};
