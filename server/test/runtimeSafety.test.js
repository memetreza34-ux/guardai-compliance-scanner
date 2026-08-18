const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertSafeRuntimeConfiguration,
  validateProductionConfiguration,
} = require('../lib/runtimeSafety');

const safeProduction = {
  NODE_ENV: 'production',
  ALLOW_PROTOTYPE_SCAN_ENDPOINTS: 'false',
  ALLOW_UNAUTHENTICATED_AI_SCANS: 'false',
  SUPABASE_URL: 'https://guardai.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  DATABASE_URL: 'postgresql://user:password@db.example.com/postgres',
  CORS_ORIGIN: 'https://app.guardai.example',
  BILLING_PROVIDER: 'disabled',
  LEAD_CAPTURE_ENABLED: 'false',
  LEAD_MARKETING_OPT_IN_ENABLED: 'false',
};

function fakePrivateKeyBase64() {
  return Buffer.from(
    '-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----',
    'utf8',
  ).toString('base64');
}

test('safe production configuration passes with optional integrations disabled', () => {
  assert.deepEqual(validateProductionConfiguration(safeProduction), []);
  assert.doesNotThrow(() => assertSafeRuntimeConfiguration(safeProduction));
});

test('development configuration is not forced to have production services', () => {
  assert.deepEqual(validateProductionConfiguration({ NODE_ENV: 'development' }), []);
});

test('unsafe prototype/AI gates fail production startup', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    ALLOW_PROTOTYPE_SCAN_ENDPOINTS: 'true',
    ALLOW_UNAUTHENTICATED_AI_SCANS: 'true',
  });
  assert.ok(errors.some((message) => message.includes('ALLOW_PROTOTYPE_SCAN_ENDPOINTS')));
  assert.ok(errors.some((message) => message.includes('ALLOW_UNAUTHENTICATED_AI_SCANS')));
});

test('secret Supabase key and insecure CORS are rejected', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    SUPABASE_PUBLISHABLE_KEY: 'sb_secret_do_not_use',
    CORS_ORIGIN: 'http://app.example.com,*',
  });
  assert.ok(errors.some((message) => message.includes('secret/service-role')));
  assert.ok(errors.some((message) => message.includes('HTTPS origin')));
});

test('Stripe billing production config requires HTTPS, server secrets and server-side Price map', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    BILLING_PROVIDER: 'stripe',
    PUBLIC_APP_URL: 'http://app.guardai.example',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    STRIPE_PLAN_PRICE_MAP_JSON: '{}',
  });
  assert.ok(errors.some((message) => message.includes('PUBLIC_APP_URL')));
  assert.ok(errors.some((message) => message.includes('STRIPE_SECRET_KEY')));
  assert.ok(errors.some((message) => message.includes('STRIPE_WEBHOOK_SECRET')));
  assert.ok(errors.some((message) => message.includes('plan/Price mapping')));
});

test('configured Stripe test-mode billing can run in a production-mode staging process', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    BILLING_PROVIDER: 'stripe',
    PUBLIC_APP_URL: 'https://staging.guardai.example',
    STRIPE_SECRET_KEY: 'sk_test_example123',
    STRIPE_WEBHOOK_SECRET: 'whsec_example123',
    STRIPE_PLAN_PRICE_MAP_JSON: '{"pro":"price_Pro123"}',
  });
  assert.deepEqual(errors, []);
});

test('Lead Capture cannot start without HTTPS Privacy/retention configuration', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    LEAD_CAPTURE_ENABLED: 'true',
    PUBLIC_APP_URL: 'http://app.guardai.example',
    LEAD_PRIVACY_NOTICE_VERSION: '',
    LEAD_RETENTION_DAYS: '0',
  });
  assert.ok(errors.some((message) => message.includes('PUBLIC_APP_URL')));
  assert.ok(errors.some((message) => message.includes('LEAD_PRIVACY_NOTICE_VERSION')));
  assert.ok(errors.some((message) => message.includes('LEAD_RETENTION_DAYS')));
});

test('Marketing opt-in remains fail-closed until Double-Opt-In delivery exists', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    LEAD_CAPTURE_ENABLED: 'true',
    LEAD_MARKETING_OPT_IN_ENABLED: 'true',
    PUBLIC_APP_URL: 'https://app.guardai.example',
    LEAD_PRIVACY_NOTICE_VERSION: '2026-08-contact-v1',
    LEAD_RETENTION_DAYS: '180',
  });
  assert.ok(errors.some((message) => message.includes('Double-Opt-In')));
});

test('partial GitHub App production configuration is rejected', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    GITHUB_APP_ID: '12345',
    GITHUB_APP_SLUG: 'guardai-test',
  });
  assert.ok(errors.some((message) => message.includes('fully configured')));
});

test('complete GitHub App production configuration passes structural gate', () => {
  const errors = validateProductionConfiguration({
    ...safeProduction,
    GITHUB_APP_ID: '12345',
    GITHUB_APP_SLUG: 'guardai-test',
    GITHUB_APP_PRIVATE_KEY_BASE64: fakePrivateKeyBase64(),
    GITHUB_APP_WEBHOOK_SECRET: 'example-secret-at-least-16',
  });
  assert.deepEqual(errors, []);
});
