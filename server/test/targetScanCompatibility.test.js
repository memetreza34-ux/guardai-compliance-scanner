const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allowedModulesForTarget,
  assertTargetSupportsModules,
} = require('../domain/targetScanCompatibility');

test('website target supports web modules only', () => {
  assert.deepEqual(
    allowedModulesForTarget('website'),
    ['security', 'privacy', 'accessibility', 'ai-governance'],
  );
  assert.doesNotThrow(() => assertTargetSupportsModules('website', ['security', 'privacy']));
});

test('repository target rejects website scanners', () => {
  assert.throws(
    () => assertTargetSupportsModules('repository', ['security']),
    (error) => error.code === 'SCAN_MODULE_TARGET_MISMATCH' && error.statusCode === 400,
  );
});

test('asset target accepts only asset module', () => {
  assert.doesNotThrow(() => assertTargetSupportsModules('asset', ['asset']));
  assert.throws(
    () => assertTargetSupportsModules('asset', ['ai-governance']),
    (error) => error.code === 'SCAN_MODULE_TARGET_MISMATCH',
  );
});
