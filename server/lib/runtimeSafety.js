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

function validateLeadProductionConfig(env, errors) {
  if (!readFlag(env.LEAD_CAPTURE_ENABLED)) {
    if (readFlag(env.LEAD_MARKETING_OPT_IN_ENABLED)) {
      errors.push('LEAD_MARKETING_OPT_IN_ENABLED must remain false while Lead Capture is disabled.');
    }
    return;
  }

  if (!/^https:\/\//i.test(env.PUBLIC_APP_URL || '')) {
    errors.push('PUBLIC_APP_URL must be an explicit HTTPS URL when Lead Capture is enabled.');
  }

  const privacyVersion = String(env.LEAD_PRIVACY_NOTICE_VERSION || '').trim();
  if (privacyVersion.length < 1 || privacyVersion.length > 120) {
    errors.push('LEAD_PRIVACY_NOTICE_VERSION is required and must be at most 120 characters.');
  }

  const retentionDays = Number(env.LEAD_RETENTION_DAYS);
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    errors.push('LEAD_RETENTION_DAYS must be an integer between 1 and 3650 when Lead Capture is enabled.');
  }

  // The current source deliberately has no outbound Double-Opt-In mail flow yet.
  if (readFlag(env.LEAD_MARKETING_OPT_IN_ENABLED)) {
    errors.push('LEAD_MARKETING_OPT_IN_ENABLED must remain false until Double-Opt-In delivery is implemented.');
  }
}

function validateGitHubProductionConfig(env, errors) {
  const values = [
    env.GITHUB_APP_ID,
    env.GITHUB_APP_SLUG,
    env.GITHUB_APP_PRIVATE_KEY_BASE64,
    env.GITHUB_APP_WEBHOOK_SECRET,
  ].map((value) => String(value || '').trim());

  const configuredCount = values.filter(Boolean).length;
  if (configuredCount === 0) return;
  if (configuredCount !== values.length) {
    errors.push('GitHub App integration must be either fully configured or fully disabled.');
    return;
  }

  const [appId, appSlug, privateKeyBase64, webhookSecret] = values;
  if (!/^\d+$/.test(appId) || Number(appId) <= 0) {
    errors.push('GITHUB_APP_ID must be a positive integer.');
  }
  if (!/^[a-z0-9-]{1,100}$/.test(appSlug)) {
    errors.push('GITHUB_APP_SLUG is invalid.');
  }

  let privateKeyPem = '';
  try {
    privateKeyPem = Buffer.from(privateKeyBase64, 'base64').toString('utf8');
  } catch {
    privateKeyPem = '';
  }
  if (!privateKeyPem.includes('PRIVATE KEY')) {
    errors.push('GITHUB_APP_PRIVATE_KEY_BASE64 must decode to a private-key PEM.');
  }
  if (webhookSecret.length < 16) {
    errors.push('GITHUB_APP_WEBHOOK_SECRET must contain at least 16 characters.');
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
  validateLeadProductionConfig(env, errors);
  validateGitHubProductionConfig(env, errors);
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
  validateGitHubProductionConfig,
  validateLeadProductionConfig,
  validateProductionConfiguration,
  validateStripeProductionConfig,
};
