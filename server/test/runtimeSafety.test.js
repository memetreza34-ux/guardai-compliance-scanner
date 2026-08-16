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
};

test('safe production configuration passes', () => {
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