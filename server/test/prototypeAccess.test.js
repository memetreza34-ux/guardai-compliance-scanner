const test = require('node:test');
const assert = require('node:assert/strict');
const { createPrototypeAccessPolicy } = require('../lib/prototypeAccess');


test('prototype scan endpoints are disabled by default', () => {
  const policy = createPrototypeAccessPolicy({});
  assert.equal(policy.enabled, false);
  assert.throws(
    () => policy.assertEnabled(),
    (error) => error.code === 'PROTOTYPE_SCAN_DISABLED' && error.statusCode === 404,
  );
});


test('prototype scan endpoints require explicit development opt-in', () => {
  const policy = createPrototypeAccessPolicy({ ALLOW_PROTOTYPE_SCAN_ENDPOINTS: 'true' });
  assert.equal(policy.enabled, true);
  assert.doesNotThrow(() => policy.assertEnabled());
});