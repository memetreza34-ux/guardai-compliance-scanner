const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createScanAccessPolicy,
  readBooleanFlag,
} = require('../lib/scanAccess');

test('AI scans are disabled by default', () => {
  const policy = createScanAccessPolicy({});

  assert.equal(policy.allowUnauthenticatedAiScans, false);
  assert.match(policy.getWebAiBlockNotice(), /disabled until GuardAI has real authentication/i);
  assert.throws(
    () => policy.assertFileAiAllowed(),
    (error) => error.name === 'HttpError' && error.statusCode === 403,
  );
});

test('AI scans require an explicit true flag', () => {
  for (const value of ['1', 'yes', 'TRUE-ish', '', undefined]) {
    assert.equal(readBooleanFlag(value), false, String(value));
  }

  assert.equal(readBooleanFlag('true'), true);
  assert.equal(readBooleanFlag(' TRUE '), true);
});

test('development override can explicitly allow unauthenticated AI scans', () => {
  const policy = createScanAccessPolicy({
    ALLOW_UNAUTHENTICATED_AI_SCANS: 'true',
  });

  assert.equal(policy.allowUnauthenticatedAiScans, true);
  assert.equal(policy.getWebAiBlockNotice(), null);
  assert.doesNotThrow(() => policy.assertFileAiAllowed());
});
