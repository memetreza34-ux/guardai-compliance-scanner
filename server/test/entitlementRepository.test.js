const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUsageRequirements } = require('../repositories/entitlementRepository');


test('usage requirements are normalized in deterministic capability order', () => {
  assert.deepEqual(
    normalizeUsageRequirements({ repository_scan: 1, ai_screening: 2 }),
    [
      { capability: 'ai_screening', units: 2 },
      { capability: 'repository_scan', units: 1 },
    ],
  );
});

test('usage requirements reject malformed capabilities and units', () => {
  assert.throws(() => normalizeUsageRequirements({ 'bad capability': 1 }), /capability/i);
  assert.throws(() => normalizeUsageRequirements({ ai_screening: 0 }), /positive integers/i);
});