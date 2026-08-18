const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assertCapabilityEntitled,
  capabilityForModule,
  requiredCapabilitiesForModules,
} = require('../domain/entitlements');


test('technical modules declare capabilities matching their runtime architecture', () => {
  assert.equal(capabilityForModule('security'), null);
  assert.equal(capabilityForModule('privacy'), 'browser_scan');
  assert.equal(capabilityForModule('accessibility'), 'browser_scan');
  assert.equal(capabilityForModule('ai-governance'), 'ai_screening');
  assert.equal(capabilityForModule('repository'), 'repository_scan');
  assert.deepEqual(
    requiredCapabilitiesForModules(['privacy', 'ai-governance', 'security']),
    ['browser_scan', 'ai_screening'],
  );
});


test('missing entitlement fails closed', () => {
  assert.throws(
    () => assertCapabilityEntitled(null, 'ai_screening', null),
    (error) => error.code === 'CAPABILITY_NOT_ENTITLED' && error.statusCode === 403,
  );
});


test('unlimited enabled entitlement passes', () => {
  assert.doesNotThrow(() => assertCapabilityEntitled(
    { capability: 'ai_screening', enabled: true, monthlyLimit: null },
    'ai_screening',
    { usedUnits: 1000, reservedUnits: 1000 },
  ));
});


test('monthly limit includes reserved concurrent usage', () => {
  assert.throws(
    () => assertCapabilityEntitled(
      { capability: 'ai_screening', enabled: true, monthlyLimit: 5 },
      'ai_screening',
      { usedUnits: 4, reservedUnits: 1 },
    ),
    (error) => error.code === 'CAPABILITY_MONTHLY_LIMIT_REACHED' && error.statusCode === 429,
  );
});
