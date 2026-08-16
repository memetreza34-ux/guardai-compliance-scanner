const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertIdempotentRequestMatches,
  sameStringArray,
} = require('../repositories/scanRepository');

test('sameStringArray compares module sets independent of order', () => {
  assert.equal(sameStringArray(['privacy', 'security'], ['security', 'privacy']), true);
  assert.equal(sameStringArray(['security'], ['security', 'privacy']), false);
});

test('idempotent scan retry accepts the same logical request', () => {
  assert.doesNotThrow(() => assertIdempotentRequestMatches(
    {
      target_id: 'target-a',
      requested_by: 'user-a',
      scanner_version: '0.1.0',
      contract_version: '0.1.0',
      requested_modules: ['privacy', 'security'],
    },
    {
      targetId: 'target-a',
      requestedBy: 'user-a',
      scannerVersion: '0.1.0',
      contractVersion: '0.1.0',
      requestedModules: ['security', 'privacy'],
    },
  ));
});

test('idempotent key reuse with different request fails', () => {
  assert.throws(
    () => assertIdempotentRequestMatches(
      {
        target_id: 'target-a',
        requested_by: 'user-a',
        scanner_version: '0.1.0',
        contract_version: '0.1.0',
        requested_modules: ['security'],
      },
      {
        targetId: 'target-b',
        requestedBy: 'user-a',
        scannerVersion: '0.1.0',
        contractVersion: '0.1.0',
        requestedModules: ['security'],
      },
    ),
    (error) => error.code === 'IDEMPOTENCY_KEY_REUSED' && error.statusCode === 409,
  );
});
